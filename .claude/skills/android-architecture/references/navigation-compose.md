# Navigation-Compose

Navigation 2.8+ with type-safe routes via `@Serializable`. String-based routes are legacy -- do not introduce them in new code.

## Setup

```kotlin
dependencies {
    implementation("androidx.navigation:navigation-compose:2.8.5")
    implementation("org.jetbrains.kotlinx:kotlinx-serialization-json:1.7.3")
}

plugins {
    id("org.jetbrains.kotlin.plugin.serialization")
}
```

## Type-safe routes

```kotlin
import kotlinx.serialization.Serializable

@Serializable
data object FarmListRoute

@Serializable
data class FieldDetailRoute(val fieldId: String, val tab: FieldTab = FieldTab.Overview)

@Serializable
data class CreateRecordRoute(val farmId: String, val fieldId: String? = null)

@Serializable
data object SettingsRoute
```

Default values become optional nav arguments. `data object` is used for destinations with no parameters (always prefer over `object`).

## NavHost

```kotlin
@Composable
fun AppNavHost(
    navController: NavHostController = rememberNavController(),
    modifier: Modifier = Modifier,
) {
    NavHost(
        navController = navController,
        startDestination = FarmListRoute,
        modifier = modifier,
    ) {
        composable<FarmListRoute> {
            FarmListScreen(
                onFieldClick = { id -> navController.navigate(FieldDetailRoute(id)) },
                onAddRecord = { farmId -> navController.navigate(CreateRecordRoute(farmId)) },
            )
        }

        composable<FieldDetailRoute> { backStackEntry ->
            val route: FieldDetailRoute = backStackEntry.toRoute()
            FieldDetailScreen(
                fieldId = route.fieldId,
                initialTab = route.tab,
                onBack = { navController.popBackStack() },
            )
        }

        composable<CreateRecordRoute> { backStackEntry ->
            val route: CreateRecordRoute = backStackEntry.toRoute()
            CreateRecordScreen(
                farmId = route.farmId,
                prefilledFieldId = route.fieldId,
                onDone = { navController.popBackStack() },
            )
        }

        composable<SettingsRoute> {
            SettingsScreen(onBack = { navController.popBackStack() })
        }
    }
}
```

## Reading route args in the ViewModel

```kotlin
@HiltViewModel
class FieldDetailViewModel @Inject constructor(
    savedStateHandle: SavedStateHandle,
    private val fieldRepository: FieldRepository,
) : ViewModel() {
    private val route: FieldDetailRoute = savedStateHandle.toRoute()
    private val fieldId: FieldId = FieldId(route.fieldId)

    val uiState: StateFlow<FieldDetailUiState> = fieldRepository
        .observeField(fieldId)
        .map { FieldDetailUiState.Loaded(it) }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), FieldDetailUiState.Loading)
}
```

Route args flow through `SavedStateHandle` automatically; no manual extraction.

## Nested graphs

Group related destinations under a single parent for scoped ViewModels and shared nav logic:

```kotlin
@Serializable
data object OnboardingGraph

@Serializable
data object OnboardingWelcome

@Serializable
data object OnboardingProfile

@Serializable
data object OnboardingPermissions

fun NavGraphBuilder.onboardingGraph(navController: NavController) {
    navigation<OnboardingGraph>(startDestination = OnboardingWelcome) {
        composable<OnboardingWelcome> {
            WelcomeScreen(onNext = { navController.navigate(OnboardingProfile) })
        }
        composable<OnboardingProfile> {
            ProfileSetupScreen(onNext = { navController.navigate(OnboardingPermissions) })
        }
        composable<OnboardingPermissions> {
            PermissionsScreen(onDone = {
                navController.navigate(FarmListRoute) {
                    popUpTo(OnboardingGraph) { inclusive = true }
                }
            })
        }
    }
}
```

A `ViewModel` scoped to the nested graph (shared across its destinations):

```kotlin
@Composable
fun ProfileSetupScreen(onNext: () -> Unit) {
    val parentEntry = remember { navController.getBackStackEntry<OnboardingGraph>() }
    val viewModel: OnboardingViewModel = hiltViewModel(parentEntry)
}
```

## Feature-module nav extensions

Each feature module exposes a `NavGraphBuilder` extension and its route types via `api`:

```kotlin
// :feature:fields (api-exported)
@Serializable
data object FieldsGraph

@Serializable
data class FieldDetailRoute(val fieldId: String)

fun NavGraphBuilder.fieldsGraph(
    navController: NavController,
    onOpenRecord: (RecordId) -> Unit,
) {
    navigation<FieldsGraph>(startDestination = FieldListRoute) {
        composable<FieldListRoute> { FieldListScreen(navController) }
        composable<FieldDetailRoute> { FieldDetailScreen(navController, onOpenRecord) }
    }
}
```

`:app` composes them:

```kotlin
NavHost(navController, startDestination = FarmListRoute) {
    farmsGraph(navController)
    fieldsGraph(navController, onOpenRecord = { navController.navigate(RecordDetailRoute(it.value)) })
    recordsGraph(navController)
}
```

## Dialog and bottom-sheet destinations

```kotlin
import androidx.navigation.compose.dialog

@Serializable
data class ConfirmDeleteRoute(val fieldId: String)

NavHost(...) {
    dialog<ConfirmDeleteRoute> { backStackEntry ->
        val route: ConfirmDeleteRoute = backStackEntry.toRoute()
        ConfirmDeleteDialog(
            fieldId = route.fieldId,
            onDismiss = { navController.popBackStack() },
        )
    }
}
```

Bottom sheets via `androidx.navigation:navigation-compose` 2.8's `bottomSheet<Route>` builder (requires `material3-adaptive-navigation`) or a manual `ModalBottomSheet` inside a `composable<Route>`.

## Deep links

```kotlin
@Serializable
data class FieldDetailRoute(val fieldId: String)

composable<FieldDetailRoute>(
    deepLinks = listOf(
        navDeepLink<FieldDetailRoute>(basePath = "https://numanac.com/fields"),
        navDeepLink<FieldDetailRoute>(basePath = "numanac://fields"),
    ),
) { backStackEntry ->
    val route: FieldDetailRoute = backStackEntry.toRoute()
    FieldDetailScreen(fieldId = route.fieldId)
}
```

Declare the intent filter in `AndroidManifest.xml`:

```xml
<activity android:name=".MainActivity">
    <intent-filter android:autoVerify="true">
        <action android:name="android.intent.action.VIEW" />
        <category android:name="android.intent.category.DEFAULT" />
        <category android:name="android.intent.category.BROWSABLE" />
        <data android:scheme="https" android:host="numanac.com" />
    </intent-filter>
</activity>
```

## Auth gating

```kotlin
@Composable
fun AppNavHost(
    authViewModel: AuthViewModel = hiltViewModel(),
    navController: NavHostController = rememberNavController(),
) {
    val authState by authViewModel.authState.collectAsStateWithLifecycle()

    LaunchedEffect(authState) {
        when (authState) {
            AuthState.SignedOut -> navController.navigate(SignInRoute) {
                popUpTo(0) { inclusive = true }
            }
            AuthState.SignedIn -> if (navController.currentDestination?.route == SignInRoute::class.qualifiedName) {
                navController.navigate(FarmListRoute) { popUpTo(0) { inclusive = true } }
            }
            AuthState.Loading -> Unit
        }
    }

    NavHost(navController, startDestination = SplashRoute) {
        composable<SplashRoute> { SplashScreen() }
        composable<SignInRoute> { SignInScreen() }
        composable<FarmListRoute> { FarmListScreen(navController) }
    }
}
```

Never gate by conditionally changing `startDestination` after the fact -- Nav won't re-evaluate.

## Popping and backstack control

| Goal | Pattern |
|------|---------|
| Go back | `navController.popBackStack()` |
| Go back, skip N | `navController.popBackStack(FarmListRoute, inclusive = false)` |
| Replace current | `navController.navigate(X) { popUpTo(currentDestination) { inclusive = true } }` |
| Clear entire stack | `navController.navigate(X) { popUpTo(0) { inclusive = true } }` |
| Single-top | `navController.navigate(X) { launchSingleTop = true }` |
| Save + restore tab state (bottom nav) | `popUpTo(rootDest) { saveState = true }`, `restoreState = true` |

## Predictive back

Navigation 2.8+ integrates with predictive back automatically for standard `composable` transitions. For custom gestures, see the `jetpack-compose-expert` skill's predictive-back reference.

## Common mistakes

- Reading route args in the composable and passing to the ViewModel via `LaunchedEffect`. Use `SavedStateHandle.toRoute()` in the ViewModel instead.
- Using string routes ("field/{id}") in new code. 2.8+ type-safe routes catch typos at compile time.
- `popBackStack` at launch without checking if it would exit the app -- use `navController.navigateUp()` or guard with `previousBackStackEntry != null`.
- Calling `navigate` in composition (bare `navController.navigate(...)` in the body). Always wrap in a lambda or `LaunchedEffect`.
- Nesting `NavHost` inside `NavHost` without a reason. One root `NavHost` + nested graphs is enough for most apps.

## Cross-references

- UI screen composition for each destination: `jetpack-compose-expert` skill
- Language-level serialization details: `kotlin-idioms` skill
- Auth gating state machine: `architecture-patterns.md`
