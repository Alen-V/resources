# DataStore

DataStore 1.1+. Two flavors: Preferences (dynamic key-value) and Proto (typed schema). Both are stable and multiplatform-ready.

## Decision: Preferences vs Proto

| Criterion | Preferences | Proto |
|-----------|-------------|-------|
| Schema | Untyped, runtime keys | Typed, compile-time |
| Migration story | Manual | Proto-versioned, forward-compat |
| Refactor safety | Low (rename = new key) | High |
| Setup cost | ~5 lines | Proto file + serializer |
| Best for | A few ad-hoc flags, experimental settings | Structured user/app settings, feature flags |

Default to Proto when the settings object will grow. Preferences is fine for "do you want notifications on" and similar binary toggles.

## Preferences DataStore

### Setup

```kotlin
dependencies {
    implementation("androidx.datastore:datastore-preferences:1.1.2")
}
```

### Definition

```kotlin
private val Context.settingsDataStore: DataStore<Preferences> by preferencesDataStore(
    name = "user_settings",
)

object SettingsKeys {
    val DarkMode = booleanPreferencesKey("dark_mode")
    val LastSyncedAt = longPreferencesKey("last_synced_at")
    val SelectedClientId = stringPreferencesKey("selected_client_id")
}
```

`preferencesDataStore` is a top-level property delegate -- one per `name` per process. Never declare it inside a composable or function scope.

### Repository

```kotlin
class UserSettingsRepository @Inject constructor(
    @ApplicationContext private val context: Context,
    @IoDispatcher private val io: CoroutineDispatcher,
) {
    private val store = context.settingsDataStore

    val darkMode: Flow<Boolean> = store.data
        .catch { e -> if (e is IOException) emit(emptyPreferences()) else throw e }
        .map { it[SettingsKeys.DarkMode] ?: false }
        .flowOn(io)

    suspend fun setDarkMode(enabled: Boolean) {
        store.edit { prefs -> prefs[SettingsKeys.DarkMode] = enabled }
    }

    suspend fun setLastSyncedAt(at: Instant) {
        store.edit { prefs -> prefs[SettingsKeys.LastSyncedAt] = at.toEpochMilli() }
    }
}
```

Always catch `IOException` -- disk reads can fail. `emptyPreferences()` falls back to defaults.

## Proto DataStore

### Proto file (`app/src/main/proto/user_settings.proto`)

```proto
syntax = "proto3";

option java_package = "com.numanac.data.settings";
option java_multiple_files = true;

message UserSettings {
    ThemeMode theme_mode = 1;
    int64 last_synced_at_millis = 2;
    string selected_client_id = 3;
    repeated string favorite_farm_ids = 4;

    enum ThemeMode {
        SYSTEM = 0;
        LIGHT = 1;
        DARK = 2;
    }
}
```

### Gradle

```kotlin
plugins {
    id("com.google.protobuf") version "0.9.4"
}

dependencies {
    implementation("androidx.datastore:datastore:1.1.2")
    implementation("com.google.protobuf:protobuf-kotlin-lite:3.25.3")
}

protobuf {
    protoc { artifact = "com.google.protobuf:protoc:3.25.3" }
    generateProtoTasks {
        all().forEach { task ->
            task.builtins {
                create("java") { option("lite") }
                create("kotlin") { option("lite") }
            }
        }
    }
}
```

### Serializer

```kotlin
object UserSettingsSerializer : Serializer<UserSettings> {
    override val defaultValue: UserSettings = UserSettings.newBuilder()
        .setThemeMode(UserSettings.ThemeMode.SYSTEM)
        .build()

    override suspend fun readFrom(input: InputStream): UserSettings =
        try {
            UserSettings.parseFrom(input)
        } catch (e: InvalidProtocolBufferException) {
            throw CorruptionException("Cannot read user settings", e)
        }

    override suspend fun writeTo(t: UserSettings, output: OutputStream) = t.writeTo(output)
}

val Context.userSettings: DataStore<UserSettings> by dataStore(
    fileName = "user_settings.pb",
    serializer = UserSettingsSerializer,
)
```

### Repository

```kotlin
class UserSettingsRepository @Inject constructor(
    @ApplicationContext context: Context,
) {
    private val store = context.userSettings

    val settings: Flow<UserSettings> = store.data
        .catch { e -> if (e is IOException) emit(UserSettingsSerializer.defaultValue) else throw e }

    suspend fun setThemeMode(mode: UserSettings.ThemeMode) {
        store.updateData { it.toBuilder().setThemeMode(mode).build() }
    }

    suspend fun toggleFavorite(farmId: String) {
        store.updateData { current ->
            val existing = current.favoriteFarmIdsList.toMutableSet()
            if (!existing.add(farmId)) existing.remove(farmId)
            current.toBuilder()
                .clearFavoriteFarmIds()
                .addAllFavoriteFarmIds(existing)
                .build()
        }
    }
}
```

`updateData` is the transactional write path -- reads current, applies the lambda, writes atomically. Never call `store.data.first()` + `store.updateData { new }` as two separate steps; that's a race.

## SharedPreferences migration

When carrying old `SharedPreferences` forward into DataStore:

```kotlin
val Context.settingsDataStore: DataStore<Preferences> by preferencesDataStore(
    name = "user_settings",
    produceMigrations = { context ->
        listOf(
            SharedPreferencesMigration(
                context = context,
                sharedPreferencesName = "legacy_prefs",
                keysToMigrate = setOf("dark_mode", "last_sync"),
            ),
        )
    },
)
```

Migration runs the first time `.data` is collected. After migration, `legacy_prefs.xml` is deleted automatically unless `deleteEmptyPreferences = false`.

## DI integration

```kotlin
@Module
@InstallIn(SingletonComponent::class)
object DataStoreModule {
    @Provides
    @Singleton
    fun provideUserSettings(@ApplicationContext context: Context): DataStore<UserSettings> =
        context.userSettings
}
```

Inject `DataStore<UserSettings>` into repositories. Never inject the raw `Context.userSettings` extension across modules.

## Testing

```kotlin
class UserSettingsRepositoryTest {
    private lateinit var testScope: TestScope
    private lateinit var store: DataStore<UserSettings>
    private lateinit var repository: UserSettingsRepository

    @Before
    fun setUp() {
        testScope = TestScope(UnconfinedTestDispatcher())
        val testFile = File.createTempFile("test_user_settings", ".pb")
        testFile.deleteOnExit()
        store = DataStoreFactory.create(
            serializer = UserSettingsSerializer,
            scope = testScope,
            produceFile = { testFile },
        )
        repository = UserSettingsRepository(store)
    }

    @Test
    fun `toggleFavorite adds and removes ids`() = testScope.runTest {
        repository.toggleFavorite("f1")
        repository.toggleFavorite("f2")
        assertThat(repository.settings.first().favoriteFarmIdsList).containsExactly("f1", "f2")

        repository.toggleFavorite("f1")
        assertThat(repository.settings.first().favoriteFarmIdsList).containsExactly("f2")
    }
}
```

Use a temp file, not the production location. Never share `DataStore` instances across tests -- one file per test.

## Encryption

DataStore does not encrypt. For secrets (tokens, keys), use EncryptedSharedPreferences, Android Keystore directly, or Tink-backed encryption wrapped around a proto serializer. Do not store auth tokens in plain DataStore.

## Common mistakes

- Declaring `preferencesDataStore(name = ...)` twice with the same name -- throws at first access.
- Reading via `store.data.first()` to "get a value" synchronously. If you need one value once, sure, but for UI always collect the flow.
- Mutating the proto `builder()` without calling `.build()`. The `updateData` lambda must return a built message.
- Injecting `Context` into a ViewModel to reach DataStore. Inject the `DataStore<T>` or a `Repository` that owns it.
- Migrating from SharedPreferences without specifying `keysToMigrate` -- everything is migrated, including legacy keys you no longer want.
- Using Preferences DataStore for settings that have grown past 5-6 keys. Migrate to Proto before it sprawls.

## Cross-references

- DI setup: `di-hilt.md` or `di-koin.md`
- Coroutine dispatching in repositories: `lifecycle.md`
- Testing flows: `testing.md`
