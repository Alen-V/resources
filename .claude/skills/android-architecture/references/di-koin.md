# Koin Dependency Injection

Koin 4.x -- runtime DI via a Kotlin DSL. Alternative to Hilt.

## When to pick Koin over Hilt

| Factor | Koin | Hilt |
|--------|------|------|
| Build time | Faster (no annotation processor) | Slower (KSP pass) |
| Safety | Runtime errors if misconfigured | Compile-time |
| Kotlin Multiplatform | First-class support | Android-only |
| Stack traces | Koin-internal frames | Mostly Dagger-generated |
| Android Studio wiring insight | Manual -- read modules | Hilt plugin visualizes graph |
| Config verification | `verify()` / `checkModules()` at test time | Compile step |

Rule of thumb: pure Android + larger team -> Hilt. Multiplatform or small app where build time is the bottleneck -> Koin.

## Setup (Gradle)

```kotlin
dependencies {
    implementation("io.insert-koin:koin-android:4.0.0")
    implementation("io.insert-koin:koin-androidx-compose:4.0.0")
    implementation("io.insert-koin:koin-androidx-workmanager:4.0.0")
    testImplementation("io.insert-koin:koin-test-junit4:4.0.0")
}
```

No plugins, no KSP.

## Module DSL

```kotlin
val dataModule = module {
    single<OkHttpClient> {
        OkHttpClient.Builder()
            .addInterceptor(HttpLoggingInterceptor())
            .build()
    }

    single<Retrofit> {
        Retrofit.Builder()
            .client(get())
            .baseUrl(BuildConfig.API_BASE_URL)
            .addConverterFactory(MoshiConverterFactory.create())
            .build()
    }

    single<FarmApi> { get<Retrofit>().create(FarmApi::class.java) }

    single<FarmRepository> { FarmRepositoryImpl(api = get(), db = get()) }
}

val databaseModule = module {
    single<NumanacDatabase> {
        Room.databaseBuilder(androidContext(), NumanacDatabase::class.java, "numanac.db")
            .fallbackToDestructiveMigration(false)
            .build()
    }
    single { get<NumanacDatabase>().farmDao() }
    single { get<NumanacDatabase>().fieldDao() }
}
```

| DSL keyword | Meaning |
|-------------|---------|
| `single` | One instance per scope root (Application by default) |
| `factory` | New instance every resolution |
| `viewModel` | Scoped to the owning `ViewModelStoreOwner` |
| `scope<T>` | Explicit scope block for per-Activity / per-user scoping |

## ViewModel + Compose

```kotlin
val viewModelModule = module {
    viewModel { FarmListViewModel(get()) }
    viewModel { (fieldId: FieldId) -> FieldDetailViewModel(get(), fieldId) }
}

@Composable
fun FarmListScreen(viewModel: FarmListViewModel = koinViewModel()) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()
}

@Composable
fun FieldDetailScreen(fieldId: FieldId) {
    val viewModel: FieldDetailViewModel = koinViewModel { parametersOf(fieldId) }
}
```

`koinViewModel()` resolves from the nearest `ViewModelStoreOwner` (nav backstack entry > activity). Equivalent of Hilt's `hiltViewModel()`.

Inject plain dependencies in composables:

```kotlin
@Composable
fun AppContent() {
    val analytics: Analytics = koinInject()
}
```

## Application startup

```kotlin
class NumanacApp : Application() {
    override fun onCreate() {
        super.onCreate()
        startKoin {
            androidLogger(Level.INFO)
            androidContext(this@NumanacApp)
            workManagerFactory()
            modules(dataModule, databaseModule, viewModelModule, featureModules)
        }
    }
}
```

Register the application in `AndroidManifest.xml`. No annotation needed on the Activity.

## Parameterized resolution

```kotlin
val module = module {
    factory { (url: String) -> ImageLoader(httpClient = get(), url = url) }
}

val loader: ImageLoader = get { parametersOf("https://...") }
```

Prefer this over Koin's old "named" qualifier for dynamic values. For static qualifiers:

```kotlin
single<OkHttpClient>(named("api")) { ... }
single<OkHttpClient>(named("imageLoader")) { ... }

val apiClient: OkHttpClient = get(named("api"))
```

## Scopes

```kotlin
val sessionModule = module {
    scope<UserSession> {
        scoped { UserPreferences(get()) }
        scoped { FeatureFlagCache(get()) }
    }
}

class UserSessionHolder : KoinScopeComponent {
    override val scope: Scope by newScope(this)

    fun close() { scope.close() }
}
```

Scopes close on demand -- useful for per-user or per-onboarding-flow state.

## Module composition

Organize modules by feature, not by layer, to match the module graph. Export one `Module` per Gradle module:

```kotlin
val farmFeatureModule = module {
    includes(farmDataModule, farmUiModule)
}
```

`:app` then calls `modules(coreModule, farmFeatureModule, fieldsFeatureModule, ...)`.

## WorkManager

```kotlin
val workerModule = module {
    worker { SyncFarmsWorker(get(), get(), androidContext(), get()) }
}

startKoin {
    workManagerFactory()
    modules(workerModule)
}
```

No Hilt-specific `@HiltWorker` needed -- Koin's `workManagerFactory()` installs the factory automatically.

## Testing

```kotlin
class FarmListViewModelTest : KoinTest {

    @get:Rule
    val koinRule = KoinTestRule.create {
        modules(module {
            single<FarmRepository> { FakeFarmRepository() }
            viewModel { FarmListViewModel(get()) }
        })
    }

    private val viewModel: FarmListViewModel by inject()

    @Test
    fun `loads farms on init`() = runTest {
        viewModel.uiState.test {
            assertThat(awaitItem().farms).hasSize(2)
        }
    }
}
```

Verify all modules resolve at test time:

```kotlin
class ModuleIntegrityTest {
    @Test
    fun `verify Koin modules`() {
        module { includes(dataModule, databaseModule, viewModelModule) }.verify()
    }

    @Test
    fun `check modules against Android app`() = checkKoinModules(
        listOf(dataModule, databaseModule, viewModelModule),
    )
}
```

`verify()` fails fast on missing bindings -- the Koin equivalent of Dagger's compile-time check.

## Common mistakes

- Using `single` for stateful objects without thinking about thread safety. `single` is lazy + cached; if two threads race the first resolution, Koin synchronizes but not your constructor's side effects.
- Forgetting `workManagerFactory()` in `startKoin` -- workers will instantiate via reflection and blow up at `doWork()`.
- Putting `viewModel` inside a non-Android module. `viewModel` is provided by `koin-android`; a pure JVM module can't declare one.
- Leaking `Activity` into a `single` -- always scope Activity-owned state with `scope<T>` or pass via `parametersOf`.
- Mixing `get()` inside a composable (outside a Koin-aware composable). Use `koinInject()` or `koinViewModel()`.

## When to go back to Hilt

See `di-hilt.md`. For a brand-new Android-only app that will have 20+ modules and many engineers, compile-time errors pay for themselves. Koin's runtime errors land on a user's device if `verify()` is not in CI.
