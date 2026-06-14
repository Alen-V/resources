# Navigation-Compose 2.8+, predictive back, deep links

Modern Android Compose apps use Navigation-Compose 2.8+ with type-safe routes and a single `Activity`. Review every nav site for string routes (legacy), `NavController` leaks, and predictive back readiness.


## Type-safe routes

Destinations are `@Serializable` objects or data classes:

```kotlin
import kotlinx.serialization.Serializable

@Serializable data object Home
@Serializable data object Settings
@Serializable data class Detail(val id: String)

@Serializable data object AuthGraph
@Serializable data object Login
@Serializable data class ResetPassword(val token: String? = null)
```

Declare the graph:

```kotlin
NavHost(navController = navController, startDestination = Home) {
    composable<Home> { HomeScreen(onOpenDetail = { navController.navigate(Detail(it)) }) }
    composable<Settings> { SettingsScreen() }
    composable<Detail> { backStackEntry ->
        val detail: Detail = backStackEntry.toRoute()
        DetailScreen(id = detail.id)
    }
    navigation<AuthGraph>(startDestination = Login) {
        composable<Login> { LoginScreen() }
        composable<ResetPassword> { /* ... */ }
    }
}
```

- `backStackEntry.toRoute<T>()` replaces the old `arguments?.getString("id")` pattern. No more manual type conversion.
- Flag any `composable("home")` / `composable("detail/{id}")` string routes in new code — migrate to typed.


## SavedStateHandle + Nav

ViewModels receive typed routes via `SavedStateHandle`:

```kotlin
@HiltViewModel
class DetailViewModel @Inject constructor(
    savedStateHandle: SavedStateHandle,
) : ViewModel() {
    private val route: Detail = savedStateHandle.toRoute()
    private val id: String = route.id
}
```

- This removes the old key-string duplication between Nav and ViewModel.


## NavController scoping

- Create the `NavController` in the composition that owns the graph, usually at the `Activity` or root composable level: `val navController = rememberNavController()`.
- Never store a `NavController` in a ViewModel, repository, or singleton. It captures the `Activity` context and leaks across configuration changes.
- Pass navigation callbacks as `(Destination) -> Unit` lambdas down the tree, not the `NavController` itself:

```kotlin
// Before — passing NavController everywhere
HomeScreen(navController = navController)

// After — passing intent-shaped callbacks
HomeScreen(
    onOpenDetail = { navController.navigate(Detail(it)) },
    onOpenSettings = { navController.navigate(Settings) },
)
```

- This keeps screens testable and previewable without a real `NavController`.


## Back stack patterns

- `navController.popBackStack()` pops the top entry. Returns `false` if the stack is already at the root.
- `navController.popBackStack(route = Home, inclusive = false)` pops to Home.
- `navController.navigate(Home) { popUpTo(Home) { inclusive = true }; launchSingleTop = true }` is the canonical "log out / go home" pattern.
- Flag nested `launchSingleTop = false` with repeated navigations to the same route — will stack dozens of copies.


## Predictive back

Android 14+ (API 34+) supports predictive back. Android 15/16 makes it default-on for apps that opted in. For Compose:

- The `Activity` must set `android:enableOnBackInvokedCallback="true"` in the manifest (`<application>` element).
- `NavController` handles predictive back automatically in Navigation-Compose 2.8+. Screen transitions animate during the back gesture.
- Use `BackHandler(enabled = ...)` only for genuine custom dismissal (closing a bottom sheet, exiting a multi-step flow). Never wrap a full screen "just in case" — it disables predictive back preview.

```kotlin
// Before — blocks predictive back for no reason
@Composable
fun DetailScreen(onBack: () -> Unit) {
    BackHandler { onBack() }
    // ...
}

// After — let NavController handle the back; only intercept when needed
@Composable
fun DetailScreen(onBack: () -> Unit, hasUnsavedChanges: Boolean) {
    BackHandler(enabled = hasUnsavedChanges) {
        showConfirmDialog = true
    }
    // ...
}
```


## Deep links

Deep links are declared on the destination:

```kotlin
composable<Detail>(
    deepLinks = listOf(
        navDeepLink<Detail>(basePath = "https://example.com/detail"),
    ),
) { ... }
```

- Typed `navDeepLink<T>()` replaces the string-template form.
- Declare the matching `<intent-filter>` in the manifest so the OS routes links to the single `Activity`.


## Scaffold integration

- One `Scaffold` per screen; do not nest `Scaffold`s.
- The `innerPadding: PaddingValues` from `Scaffold` must be applied to the top layout of the content — usually via `Modifier.padding(innerPadding)` or consumed by a `LazyColumn`'s `contentPadding`.
- For an app-wide `NavigationBar` or `NavigationRail`, use a root `Scaffold` or `NavigationSuiteScaffold` that wraps the `NavHost`; individual screens then use a plain `Scaffold(topBar = ...)` without their own bottom bar.


## Modal bottom sheets as destinations

Navigation-Compose provides `bottomSheet<Route> { ... }` via `androidx.navigation:navigation-compose-material3` (or the BOM equivalent). Prefer this over imperative `ModalBottomSheet` whose open state lives in a composable — destinations are URL-addressable and survive process death.


## Anti-patterns

- `composable("user/{id}/post/{postId}")` with `arguments = listOf(navArgument("id") { type = NavType.StringType })` — legacy. Use `@Serializable data class UserPost(val id: String, val postId: String)`.
- A `ViewModel` that holds a `NavController`. Always a leak.
- `LaunchedEffect(Unit) { navController.navigate(NextScreen) }` that fires on every entry — key on the condition, not `Unit`, and prefer event channels.
- Two `NavHost`s in the same composition hierarchy with overlapping routes.
- `popBackStack()` without checking result when the handler matters for UX (swallowed "no-op pop").


## Review checklist

- All destinations are `@Serializable` types — no string routes.
- `composable<T>`, `navigation<T>`, and `navDeepLink<T>` are used instead of their string counterparts.
- `NavController` is created at the root and passed into `NavHost` only. Never stored in a ViewModel.
- Screens receive navigation lambdas, not `NavController` directly.
- `BackHandler` is conditional (`enabled = ...`) and only present when custom behaviour is actually needed.
- `Scaffold` `innerPadding` is applied; no nested `Scaffold`s.
- Predictive-back support is not broken by manifest flags or full-screen `BackHandler(enabled = true)`.
- Typed routes supply `SavedStateHandle.toRoute<T>()` in ViewModels.
