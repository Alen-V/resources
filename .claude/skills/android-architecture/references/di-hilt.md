# Hilt (Dagger) Dependency Injection

Hilt 2.5x + Dagger 2.5x + KSP. The compile-time-safe default for Android DI.

## Setup (Gradle)

```kotlin
plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("com.google.devtools.ksp")
    id("com.google.dagger.hilt.android")
}

dependencies {
    implementation("com.google.dagger:hilt-android:2.52")
    ksp("com.google.dagger:hilt-android-compiler:2.52")
    implementation("androidx.hilt:hilt-navigation-compose:1.2.0")
    implementation("androidx.hilt:hilt-work:1.2.0")
    ksp("androidx.hilt:hilt-compiler:1.2.0")
}
```

Never set up `kotlin-kapt` for Hilt. KAPT is deprecated under K2; use KSP.

## Application + Activity entry points

```kotlin
@HiltAndroidApp
class NumanacApp : Application()

@AndroidEntryPoint
class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent { NumanacTheme { AppNavHost() } }
    }
}
```

`@AndroidEntryPoint` is required on Activities, Fragments, Services, and BroadcastReceivers that inject. Compose-only apps only need it on the host Activity.

## ViewModel injection

```kotlin
@HiltViewModel
class FarmListViewModel @Inject constructor(
    private val farmRepository: FarmRepository,
    savedStateHandle: SavedStateHandle,
) : ViewModel() {
    private val _uiState = MutableStateFlow(FarmListUiState())
    val uiState: StateFlow<FarmListUiState> = _uiState.asStateFlow()
}

@Composable
fun FarmListScreen(viewModel: FarmListViewModel = hiltViewModel()) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()
}
```

`hiltViewModel()` from `androidx.hilt:hilt-navigation-compose` resolves the correct scope (nav backstack entry > activity).

## Modules: `@Provides` vs `@Binds`

```kotlin
@Module
@InstallIn(SingletonComponent::class)
object NetworkModule {
    @Provides
    @Singleton
    fun provideHttpClient(): OkHttpClient = OkHttpClient.Builder()
        .addInterceptor(HttpLoggingInterceptor())
        .build()

    @Provides
    @Singleton
    fun provideRetrofit(client: OkHttpClient): Retrofit = Retrofit.Builder()
        .client(client)
        .baseUrl(BuildConfig.API_BASE_URL)
        .addConverterFactory(MoshiConverterFactory.create())
        .build()
}

@Module
@InstallIn(SingletonComponent::class)
abstract class RepositoryModule {
    @Binds
    @Singleton
    abstract fun bindFarmRepository(impl: FarmRepositoryImpl): FarmRepository
}
```

| Rule | |
|------|---|
| Concrete class you own with `@Inject constructor` | `@Binds` |
| Third-party class you must instantiate | `@Provides` |
| Needs runtime logic | `@Provides` |

Prefer `@Binds` where possible -- generates less Dagger code.

## Scopes

| Scope | Lifetime | Typical use |
|-------|----------|-------------|
| `@Singleton` + `SingletonComponent` | Application process | Repositories, HTTP client, DB |
| `@ActivityRetainedScoped` + `ActivityRetainedComponent` | Survives config change | Shared state across Fragments/ViewModels in one Activity |
| `@ViewModelScoped` + `ViewModelComponent` | ViewModel instance | State holders used by a single ViewModel |
| `@ActivityScoped` + `ActivityComponent` | Activity (dies on config change) | Rare; usually wrong choice |
| unscoped | New instance per injection | Stateless helpers, use-cases |

Default to unscoped. Only add a scope when there is a real reason (shared mutable state, expensive construction).

## Qualifiers

```kotlin
@Qualifier
@Retention(AnnotationRetention.BINARY)
annotation class ApiOkHttp

@Qualifier
@Retention(AnnotationRetention.BINARY)
annotation class ImageLoaderOkHttp

@Provides
@Singleton
@ApiOkHttp
fun provideApiClient(): OkHttpClient = OkHttpClient.Builder()
    .addInterceptor(AuthInterceptor())
    .build()

@Provides
@Singleton
@ImageLoaderOkHttp
fun provideImageClient(): OkHttpClient = OkHttpClient.Builder()
    .cache(imageCache)
    .build()
```

Use `@ApplicationContext` and `@ActivityContext` from Hilt -- do not create custom context qualifiers.

## Assisted injection

Runtime parameters (user ID, resource key) that Hilt can't know at compile time.

```kotlin
class FieldDetailViewModel @AssistedInject constructor(
    private val fieldRepository: FieldRepository,
    @Assisted private val fieldId: FieldId,
) : ViewModel() {

    @AssistedFactory
    interface Factory {
        fun create(fieldId: FieldId): FieldDetailViewModel
    }
}

@Composable
fun FieldDetailScreen(fieldId: FieldId) {
    val viewModel = hiltViewModel<FieldDetailViewModel, FieldDetailViewModel.Factory>(
        creationCallback = { factory -> factory.create(fieldId) },
    )
}
```

For navigation-provided IDs, prefer reading from `SavedStateHandle` inside a regular `@HiltViewModel` -- it's simpler:

```kotlin
@HiltViewModel
class FieldDetailViewModel @Inject constructor(
    savedStateHandle: SavedStateHandle,
    fieldRepository: FieldRepository,
) : ViewModel() {
    private val route: FieldDetailRoute = savedStateHandle.toRoute()
    private val fieldId: FieldId = route.fieldId
}
```

Use assisted injection when the parameter cannot come from nav args (e.g., constructed in response to a user action).

## `@EntryPoint` for non-Hilt classes

When a class cannot be `@AndroidEntryPoint` (library-owned, platform-instantiated), pull dependencies via `EntryPoint`:

```kotlin
@EntryPoint
@InstallIn(SingletonComponent::class)
interface GlanceEntryPoint {
    fun farmRepository(): FarmRepository
}

class FarmGlanceWidget : GlanceAppWidget() {
    override suspend fun provideGlance(context: Context, id: GlanceId) {
        val entryPoint = EntryPointAccessors.fromApplication<GlanceEntryPoint>(context)
        val repo = entryPoint.farmRepository()
    }
}
```

Hilt has first-class integration for `WorkManager` (`@HiltWorker`, see `workmanager.md`) -- do not use `@EntryPoint` for workers.

## Testing

```kotlin
@HiltAndroidTest
@UninstallModules(NetworkModule::class)
class FarmListViewModelTest {

    @get:Rule(order = 0)
    val hiltRule = HiltAndroidRule(this)

    @BindValue
    @JvmField
    val fakeRepository: FarmRepository = FakeFarmRepository()

    @Test
    fun `loads farms on init`() = runTest {
        val viewModel = FarmListViewModel(fakeRepository, SavedStateHandle())
        viewModel.uiState.test {
            assertThat(awaitItem().farms).hasSize(2)
        }
    }
}
```

Requires a custom runner:

```kotlin
class HiltTestRunner : AndroidJUnitRunner() {
    override fun newApplication(cl: ClassLoader?, name: String?, context: Context?): Application =
        super.newApplication(cl, HiltTestApplication::class.java.name, context)
}
```

And `testInstrumentationRunner = "com.numanac.HiltTestRunner"` in `build.gradle.kts`.

See `testing.md` for deeper test patterns.

## Common mistakes

- Using `@Inject lateinit var` on a ViewModel constructor argument. Constructor injection only.
- Creating a `ViewModelProvider.Factory` manually when `@HiltViewModel` + `hiltViewModel()` would work.
- Putting `@Singleton` on everything. Most repositories deserve it; most use-cases do not.
- Registering `@AndroidEntryPoint` on a `ComponentActivity` that only hosts Compose and injects nothing. Not needed if nothing is injected directly into the Activity.
- `@Module object` with `@Binds` -- `@Binds` requires an abstract class or interface.

## When to prefer Koin

See `di-koin.md`. Short version: Koin wins on build time and Kotlin Multiplatform; Hilt wins on compile-time safety and stack trace quality. For a single-platform Android app with substantial team size, Hilt is the default.
