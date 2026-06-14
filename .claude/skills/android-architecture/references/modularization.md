# Modularization

Feature-first module graph. Top-down: `:app` -> `:feature:*` -> `:core:*` -> `:data:*`. No cycles.

## Module taxonomy

```
:app
  |
  +-- :feature:farms
  +-- :feature:fields
  +-- :feature:records
  +-- :feature:settings
  |
  +-- :core:design     (theme, tokens, reusable Compose primitives)
  +-- :core:ui         (shared UI utilities: snackbars, insets, error screens)
  +-- :core:data       (Repository interfaces, domain models)
  +-- :core:model      (pure Kotlin domain types, value classes, sealed results)
  +-- :core:common     (dispatchers, logging, date utils)
  +-- :core:network    (HTTP client, auth interceptor, base Retrofit config)
  +-- :core:database   (Room DB, DAO interfaces, type converters)
  +-- :core:datastore  (Proto/Preferences DataStore setup)
  |
  +-- :data:farms      (FarmRepositoryImpl, API/DAO mapping)
  +-- :data:fields
  +-- :data:records
  |
  +-- :build-logic     (convention plugins)
```

### Rules

1. `:app` depends on every `:feature:*` and wires DI. No feature depends on `:app`.
2. `:feature:foo` depends on `:core:*` and the corresponding `:data:foo` (for repository access).
3. `:data:foo` implements interfaces from `:core:data` and depends on `:core:network` + `:core:database`.
4. `:core:model` is the deepest leaf -- pure Kotlin (`com.android.library` is fine, but no Android APIs). Depends on nothing.
5. Never cross-feature dependency (`:feature:fields` -> `:feature:records` = bad). Shared code moves to `:core:data` or a new `:core` module.

## When to add a module

| Signal | Action |
|--------|--------|
| A file is imported by >3 features | Move to `:core:*` |
| A feature has >40 files in `:app` | Extract `:feature:<name>` |
| Build time > 60s for incremental | Check module graph; look for `api` deps that should be `implementation` |
| Gradle sync > 15s | Too many modules or too many plugins in each |
| Can't import a class because of cycles | The cycle is already telling you the split is wrong |

Under ~3 features, a monolithic `:app` is fine. Don't modularize prematurely.

## `api` vs `implementation`

```kotlin
dependencies {
    api(libs.androidx.core.ktx)
    api(project(":core:model"))

    implementation(project(":core:network"))
    implementation(libs.retrofit)
}
```

| Declaration | Effect |
|-------------|--------|
| `api` | Consumers of THIS module also see the dependency |
| `implementation` | Consumers do NOT see the dependency |

Default to `implementation`. `api` is a public contract -- changing it breaks downstream modules.

When to use `api`:
- Types that cross module boundaries (navigation routes, Kotlin domain models, public interfaces)
- Compose runtime (in `:core:design` when it exports composables)

Never `api` a third-party library unless you are a library module designed for others to depend on.

## Gradle version catalog

`gradle/libs.versions.toml`:

```toml
[versions]
kotlin = "2.2.0"
agp = "8.9.0"
ksp = "2.2.0-2.0.1"
hilt = "2.52"
compose-bom = "2026.02.00"
room = "2.7.0"
navigation-compose = "2.8.5"
coroutines = "1.9.0"
work = "2.10.0"
lifecycle = "2.9.0"

[libraries]
androidx-core-ktx = { module = "androidx.core:core-ktx", version = "1.15.0" }
androidx-lifecycle-runtime = { module = "androidx.lifecycle:lifecycle-runtime-ktx", version.ref = "lifecycle" }
androidx-lifecycle-viewmodel-compose = { module = "androidx.lifecycle:lifecycle-viewmodel-compose", version.ref = "lifecycle" }
androidx-lifecycle-runtime-compose = { module = "androidx.lifecycle:lifecycle-runtime-compose", version.ref = "lifecycle" }
compose-bom = { module = "androidx.compose:compose-bom", version.ref = "compose-bom" }
compose-ui = { module = "androidx.compose.ui:ui" }
compose-material3 = { module = "androidx.compose.material3:material3" }
hilt-android = { module = "com.google.dagger:hilt-android", version.ref = "hilt" }
hilt-compiler = { module = "com.google.dagger:hilt-android-compiler", version.ref = "hilt" }
hilt-navigation-compose = { module = "androidx.hilt:hilt-navigation-compose", version = "1.2.0" }
navigation-compose = { module = "androidx.navigation:navigation-compose", version.ref = "navigation-compose" }
room-runtime = { module = "androidx.room:room-runtime", version.ref = "room" }
room-ktx = { module = "androidx.room:room-ktx", version.ref = "room" }
room-compiler = { module = "androidx.room:room-compiler", version.ref = "room" }
work-runtime-ktx = { module = "androidx.work:work-runtime-ktx", version.ref = "work" }
coroutines-core = { module = "org.jetbrains.kotlinx:kotlinx-coroutines-core", version.ref = "coroutines" }
coroutines-test = { module = "org.jetbrains.kotlinx:kotlinx-coroutines-test", version.ref = "coroutines" }
turbine = { module = "app.cash.turbine:turbine", version = "1.2.0" }
mockk = { module = "io.mockk:mockk", version = "1.13.14" }

[plugins]
android-application = { id = "com.android.application", version.ref = "agp" }
android-library = { id = "com.android.library", version.ref = "agp" }
kotlin-android = { id = "org.jetbrains.kotlin.android", version.ref = "kotlin" }
kotlin-serialization = { id = "org.jetbrains.kotlin.plugin.serialization", version.ref = "kotlin" }
ksp = { id = "com.google.devtools.ksp", version.ref = "ksp" }
hilt = { id = "com.google.dagger.hilt.android", version.ref = "hilt" }
```

Reference across modules:

```kotlin
dependencies {
    implementation(libs.androidx.core.ktx)
    implementation(libs.navigation.compose)
    implementation(platform(libs.compose.bom))
    implementation(libs.compose.ui)
    implementation(libs.compose.material3)
}
```

One source of truth for versions. Never hardcode a library version in a `build.gradle.kts`.

## Convention plugins (`build-logic`)

`build-logic/` as an included build in `settings.gradle.kts`:

```kotlin
pluginManagement {
    includeBuild("build-logic")
}
```

`build-logic/convention/src/main/kotlin/AndroidLibraryConventionPlugin.kt`:

```kotlin
class AndroidLibraryConventionPlugin : Plugin<Project> {
    override fun apply(target: Project) = with(target) {
        with(pluginManager) {
            apply("com.android.library")
            apply("org.jetbrains.kotlin.android")
        }

        extensions.configure<LibraryExtension> {
            compileSdk = 36
            defaultConfig {
                minSdk = 26
            }
            compileOptions {
                sourceCompatibility = JavaVersion.VERSION_17
                targetCompatibility = JavaVersion.VERSION_17
            }
        }

        extensions.configure<KotlinAndroidProjectExtension> {
            jvmToolchain(17)
            compilerOptions {
                freeCompilerArgs.addAll("-Xjsr305=strict")
            }
        }
    }
}
```

Register in `build-logic/convention/build.gradle.kts`:

```kotlin
gradlePlugin {
    plugins {
        register("androidLibrary") {
            id = "numanac.android.library"
            implementationClass = "AndroidLibraryConventionPlugin"
        }
        register("androidFeature") {
            id = "numanac.android.feature"
            implementationClass = "AndroidFeatureConventionPlugin"
        }
    }
}
```

Feature module `build.gradle.kts` becomes:

```kotlin
plugins {
    alias(libs.plugins.numanac.android.feature)
}
dependencies {
    implementation(project(":core:design"))
    implementation(project(":core:data"))
    implementation(project(":data:farms"))
}
```

Eliminates Gradle boilerplate duplication. Do not use `buildSrc` for this in new projects -- `buildSrc` invalidates the whole build on any edit; included builds don't.

## Avoiding cycles

Gradle fails with `Circular reference between projects: ...` on cycles. Inverting the dependency is always the fix:

```
BAD:  :feature:records  <-->  :feature:fields
GOOD: :feature:records  -->  :core:data  <--  :feature:fields
            (both depend on shared interfaces in :core:data)
```

If `:core:data` starts needing code from `:feature:*`, you have a mislabeled feature -- that "feature" is actually core.

## Example feature module layout

```
:feature:farms/
  src/main/kotlin/com/numanac/feature/farms/
    FarmListScreen.kt
    FarmListViewModel.kt
    FarmListUiState.kt
    FarmsGraph.kt        (public: navigation extension)
    FarmsRoute.kt        (public: @Serializable routes)
    di/FarmsFeatureModule.kt
```

`FarmsGraph.kt` and `FarmsRoute.kt` are part of the `api` surface. Everything else is internal -- the rest of the app goes through navigation.

## Common mistakes

- One giant `:ui` module containing every screen. Become a bottleneck the moment two people touch it.
- `:feature:foo` depending on `:feature:bar`. Shared code belongs in `:core:*`.
- `api(project(...))` by default. Creeping transitive dependency surface. Use `implementation` unless the type genuinely crosses modules.
- Pinning versions per module. Use the version catalog.
- Using `buildSrc` in a large project. Switch to an included-build convention plugin.
- Letting `:app` contain "just a bit" of feature code. Once you've split, keep `:app` as a wiring layer only.

## Cross-references

- DI wiring across modules: `di-hilt.md`
- Nav route export from feature modules: `navigation-compose.md`
- Domain model / entity separation: `architecture-patterns.md`
