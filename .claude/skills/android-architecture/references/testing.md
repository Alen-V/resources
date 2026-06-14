# Testing

Three test surfaces: pure-JVM (fast, most logic), Robolectric (ViewModel + repository with Android framework types), and instrumented (device/emulator for real integration). Test at the lowest tier that gives a real signal.

## Tier table

| Test type | Runs on | When to use |
|-----------|---------|-------------|
| Pure JVM (JUnit) | JVM | `:core:model`, pure Kotlin modules, no Android APIs |
| Robolectric | JVM (simulated Android) | ViewModel, Repository, WorkManager unit tests |
| Compose UI (`createAndroidComposeRule`) | JVM (Robolectric) or device | Composable behavior, form flows, navigation |
| Instrumented (`androidTest`) | Device/emulator | Real DB migrations, real WorkManager, end-to-end |
| Screenshot (Paparazzi / Roborazzi) | JVM | Visual regression of composables |

Do not write an instrumented test for something that could be Robolectric. Device tests are 10-50x slower.

## Gradle

```kotlin
dependencies {
    testImplementation(libs.junit)
    testImplementation(libs.coroutines.test)
    testImplementation(libs.turbine)
    testImplementation(libs.mockk)
    testImplementation("org.robolectric:robolectric:4.14")
    testImplementation("io.kotest:kotest-assertions-core:5.9.1")
    testImplementation("androidx.arch.core:core-testing:2.2.0")

    androidTestImplementation("androidx.test.ext:junit:1.2.1")
    androidTestImplementation("androidx.compose.ui:ui-test-junit4")
    debugImplementation("androidx.compose.ui:ui-test-manifest")

    testImplementation("com.google.dagger:hilt-android-testing:2.52")
    kspTest("com.google.dagger:hilt-android-compiler:2.52")
}

android {
    testOptions {
        unitTests.isIncludeAndroidResources = true
    }
}
```

## `runTest` + coroutines

```kotlin
class FarmRepositoryTest {
    private val dispatcher = UnconfinedTestDispatcher()
    private val farmDao = mockk<FarmDao>(relaxed = true)
    private val farmApi = mockk<FarmApi>()
    private lateinit var repo: FarmRepositoryImpl

    @Before
    fun setUp() {
        repo = FarmRepositoryImpl(farmDao, farmApi, dispatcher)
    }

    @Test
    fun `refresh upserts remote farms`() = runTest(dispatcher) {
        coEvery { farmApi.listFarms() } returns listOf(fakeFarmDto)
        repo.refresh()
        coVerify { farmDao.upsert(match { it.size == 1 }) }
    }
}
```

| Dispatcher | Use |
|------------|-----|
| `UnconfinedTestDispatcher()` | New-style tests; executes eagerly |
| `StandardTestDispatcher()` | When testing order matters; requires `advanceUntilIdle()` |

Avoid `runBlocking` in tests -- it doesn't integrate with virtual time.

## Turbine for Flow

```kotlin
@Test
fun `observeFarms emits mapped entities`() = runTest {
    every { farmDao.observeFarmsForClient("c1") } returns flowOf(
        listOf(FarmEntity(id = "f1", clientId = "c1", name = "North", slug = "north", createdAt = 0, locationLat = null, locationLng = null)),
    )

    repo.observeFarms(ClientId("c1")).test {
        val farms = awaitItem()
        assertThat(farms).hasSize(1)
        assertThat(farms.first().name).isEqualTo("North")
        awaitComplete()
    }
}
```

Turbine's `test { }` suspends until `awaitItem()` / `awaitComplete()` / `awaitError()`. Never `first()` in a test you want to assert multiple emissions on.

## MockK tips

```kotlin
private val authRepo = mockk<AuthRepository>()

every { authRepo.currentClientId } returns flowOf(ClientId("c1"))
coEvery { authRepo.signOut() } just Runs

coEvery { authRepo.fetchProfile() } throws IOException("network down")

coVerify(exactly = 1) { authRepo.signOut() }
verify { authRepo.currentClientId }
```

Use `relaxed = true` for large interfaces where you only care about one method -- avoids `MockKException: no answer found`.

Hilt + MockK: wire test doubles via `@BindValue` (see below). Don't call `mockk<Context>()` -- use `ApplicationProvider.getApplicationContext()`.

## Hilt-instrumented testing

```kotlin
@HiltAndroidTest
@UninstallModules(NetworkModule::class)
@RunWith(AndroidJUnit4::class)
class FarmListScreenTest {

    @get:Rule(order = 0) val hiltRule = HiltAndroidRule(this)
    @get:Rule(order = 1) val composeRule = createAndroidComposeRule<HiltTestActivity>()

    @BindValue @JvmField
    val farmApi: FarmApi = FakeFarmApi()

    @Before
    fun setUp() {
        hiltRule.inject()
    }

    @Test
    fun showsFarmsAfterLoad() {
        composeRule.setContent {
            NumanacTheme { FarmListScreen() }
        }
        composeRule.onNodeWithText("North Farm").assertIsDisplayed()
    }
}
```

Requires:
- `HiltTestRunner` in `defaultConfig.testInstrumentationRunner` (see `di-hilt.md`)
- An empty `HiltTestActivity` in `debugImplementation`

## Compose UI tests

```kotlin
@RunWith(AndroidJUnit4::class)
class CreateRecordScreenTest {
    @get:Rule val composeRule = createComposeRule()

    @Test
    fun `submit disabled when fields blank`() {
        val state = mutableStateOf(CreateRecordState())
        composeRule.setContent {
            CreateRecordForm(state = state.value, onIntent = {})
        }
        composeRule.onNodeWithText("Save").assertIsNotEnabled()
    }

    @Test
    fun `submit emits intent`() {
        val intents = mutableListOf<CreateRecordIntent>()
        composeRule.setContent {
            CreateRecordForm(
                state = CreateRecordState(draft = validDraft),
                onIntent = intents::add,
            )
        }
        composeRule.onNodeWithText("Save").performClick()
        assertThat(intents).contains(CreateRecordIntent.Submit)
    }
}
```

| Matcher | Finds |
|---------|-------|
| `onNodeWithText("X")` | Text content "X" |
| `onNodeWithContentDescription("X")` | Semantic content description (icon buttons) |
| `onNodeWithTag("save_button")` | `Modifier.testTag` |
| `onAllNodesWithText(...)` | Multiple matches |
| `onNode(hasText("X") and isEnabled())` | Compound |

Prefer semantics-tree matchers over `testTag` -- if TalkBack can find it, so can a test. Use `testTag` only when the element has no visible or accessible text.

Robolectric-mode Compose tests:

```kotlin
@RunWith(RobolectricTestRunner::class)
@Config(application = HiltTestApplication::class)
class FarmListScreenRobolectricTest {
    @get:Rule val composeRule = createComposeRule()
}
```

Runs on JVM -- no emulator needed, but Recomposition of heavy frames (maps, OpenGL) may not render.

## Test navigation

```kotlin
@Test
fun `clicking farm navigates to detail`() {
    lateinit var navController: TestNavHostController

    composeRule.setContent {
        navController = TestNavHostController(LocalContext.current)
        navController.navigatorProvider.addNavigator(ComposeNavigator())
        AppNavHost(navController = navController)
    }

    composeRule.onNodeWithText("North Farm").performClick()

    val current = navController.currentBackStackEntry?.toRoute<FieldListRoute>()
    assertThat(current).isNotNull()
}
```

## Room tests

```kotlin
@RunWith(AndroidJUnit4::class)
class FarmDaoTest {
    private lateinit var db: NumanacDatabase
    private lateinit var dao: FarmDao

    @Before
    fun setUp() {
        db = Room.inMemoryDatabaseBuilder(
            ApplicationProvider.getApplicationContext(),
            NumanacDatabase::class.java,
        ).allowMainThreadQueries().build()
        dao = db.farmDao()
    }

    @After fun tearDown() { db.close() }

    @Test
    fun observesUpserts() = runTest {
        dao.observeFarmsForClient("c1").test {
            assertThat(awaitItem()).isEmpty()
            dao.upsert(listOf(fakeEntity))
            assertThat(awaitItem()).hasSize(1)
        }
    }
}
```

Use Robolectric for Room DAO tests -- no emulator, full SQLite. Migration tests need `MigrationTestHelper` (see `room.md`).

## WorkManager tests

```kotlin
@RunWith(AndroidJUnit4::class)
class SyncFarmsWorkerTest {
    @Test
    fun `returns success`() = runTest {
        val worker = TestListenableWorkerBuilder<SyncFarmsWorker>(context)
            .setInputData(workDataOf(SyncFarmsWorker.KEY_CLIENT_ID to "c1"))
            .setWorkerFactory(fakeFactory)
            .build()
        val result = worker.doWork()
        assertThat(result).isInstanceOf(ListenableWorker.Result.Success::class.java)
    }
}
```

For chain tests use `WorkManagerTestInitHelper`:

```kotlin
@Before
fun setUp() {
    val config = Configuration.Builder()
        .setExecutor(SynchronousExecutor())
        .setMinimumLoggingLevel(Log.DEBUG)
        .build()
    WorkManagerTestInitHelper.initializeTestWorkManager(context, config)
}
```

## Screenshot testing

| Tool | Runs on | Notes |
|------|---------|-------|
| Paparazzi | JVM only | Does not execute real Compose; ahead of curve for Compose support |
| Roborazzi | Robolectric | Works with `createComposeRule()`; verifies pixel-identical output |

Roborazzi is the safer default for Compose-heavy apps in 2026.

```kotlin
@RunWith(AndroidJUnit4::class)
@Config(qualifiers = RobolectricDeviceQualifiers.Pixel7)
class FarmCardScreenshotTest {
    @get:Rule val composeRule = createComposeRule()

    @Test
    fun farmCard_default() {
        composeRule.setContent {
            NumanacTheme { FarmCard(farm = sampleFarm) }
        }
        composeRule.onRoot().captureRoboImage()
    }
}
```

## Common mistakes

- `runBlocking { }` in a suspend test. Use `runTest`.
- Sharing a `TestCoroutineScheduler` across tests. New dispatcher per test.
- Testing a ViewModel by constructing a real `Application`. Inject the dependencies; no Application needed.
- Using `onNodeWithText` on a button whose label changes by theme / locale. Prefer `contentDescription`.
- Asserting on implementation details (e.g., "Repository called with X"). Assert on observable state; let the test be refactor-proof.
- One giant test class per feature. Split by scenario: `FarmListRefreshTest`, `FarmListEmptyStateTest`.
- Writing an instrumented test to validate a pure Kotlin function. Use a JVM test.

## Cross-references

- DI module uninstallation: `di-hilt.md`
- Dispatcher qualifier setup: `lifecycle.md`
- Room migration tests in detail: `room.md`
- Compose accessibility semantics (feeds test matchers): `jetpack-compose-expert` skill
