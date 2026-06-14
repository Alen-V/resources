# WorkManager

WorkManager 2.10+. The official deferred background work API. Use it for anything that must survive process death and app restarts.

## Setup

```kotlin
dependencies {
    implementation("androidx.work:work-runtime-ktx:2.10.0")
    implementation("androidx.hilt:hilt-work:1.2.0")
    ksp("androidx.hilt:hilt-compiler:1.2.0")
}
```

Disable the default initializer when using Hilt:

```xml
<provider
    android:name="androidx.startup.InitializationProvider"
    android:authorities="${applicationId}.androidx-startup"
    android:exported="false"
    tools:node="merge">
    <meta-data
        android:name="androidx.work.WorkManagerInitializer"
        android:value="androidx.startup"
        tools:node="remove" />
</provider>
```

## CoroutineWorker

Always use `CoroutineWorker` for new work -- suspend-first, cancellable.

```kotlin
@HiltWorker
class SyncFarmsWorker @AssistedInject constructor(
    @Assisted context: Context,
    @Assisted params: WorkerParameters,
    private val farmRepository: FarmRepository,
    private val authRepository: AuthRepository,
) : CoroutineWorker(context, params) {

    override suspend fun doWork(): Result {
        val clientId = inputData.getString(KEY_CLIENT_ID)?.let(::ClientId)
            ?: return Result.failure()

        if (!authRepository.isSignedIn()) return Result.success()

        return try {
            farmRepository.refresh(clientId)
            Result.success(workDataOf(KEY_SYNCED_COUNT to farmRepository.countFor(clientId)))
        } catch (e: IOException) {
            if (runAttemptCount < MAX_ATTEMPTS) Result.retry() else Result.failure()
        }
    }

    companion object {
        const val KEY_CLIENT_ID = "client_id"
        const val KEY_SYNCED_COUNT = "synced_count"
        const val UNIQUE_NAME = "sync_farms"
        private const val MAX_ATTEMPTS = 3
    }
}
```

| Result | Semantics |
|--------|-----------|
| `Result.success(Data)` | Done. Data flows to next worker in chain. |
| `Result.retry()` | Reschedule with backoff policy. Respects `setBackoffCriteria`. |
| `Result.failure(Data)` | Permanent failure. Does not retry; fails any chain. |

## Hilt integration

```kotlin
class NumanacApp : Application(), Configuration.Provider {
    @Inject lateinit var workerFactory: HiltWorkerFactory

    override val workManagerConfiguration: Configuration
        get() = Configuration.Builder()
            .setWorkerFactory(workerFactory)
            .setMinimumLoggingLevel(android.util.Log.INFO)
            .build()
}
```

`@HiltWorker` + `@AssistedInject` is required -- you cannot use `@Inject constructor` directly because `WorkManager` creates workers via reflection.

## One-time work

```kotlin
class SyncScheduler @Inject constructor(
    private val workManager: WorkManager,
) {
    fun syncFarmsNow(clientId: ClientId) {
        val request = OneTimeWorkRequestBuilder<SyncFarmsWorker>()
            .setInputData(workDataOf(SyncFarmsWorker.KEY_CLIENT_ID to clientId.value))
            .setConstraints(
                Constraints.Builder()
                    .setRequiredNetworkType(NetworkType.CONNECTED)
                    .build(),
            )
            .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 10, TimeUnit.SECONDS)
            .addTag(TAG_FARM_SYNC)
            .build()

        workManager.enqueueUniqueWork(
            SyncFarmsWorker.UNIQUE_NAME,
            ExistingWorkPolicy.KEEP,
            request,
        )
    }

    companion object { const val TAG_FARM_SYNC = "farm_sync" }
}
```

### ExistingWorkPolicy

| Policy | Meaning |
|--------|---------|
| `KEEP` | If existing work pending, skip enqueue. Safe default for "ensure X happens". |
| `REPLACE` | Cancel existing, enqueue new. Use when inputs changed meaningfully. |
| `APPEND` | Chain after existing. Careful -- if previous fails, chain fails. |
| `APPEND_OR_REPLACE` | Append if running, else replace if cancelled/failed. Usually what you want. |

## Periodic work

```kotlin
fun schedulePeriodicSync() {
    val request = PeriodicWorkRequestBuilder<SyncFarmsWorker>(
        repeatInterval = 6,
        repeatIntervalTimeUnit = TimeUnit.HOURS,
        flexTimeInterval = 1,
        flexTimeIntervalUnit = TimeUnit.HOURS,
    )
        .setConstraints(
            Constraints.Builder()
                .setRequiredNetworkType(NetworkType.UNMETERED)
                .setRequiresBatteryNotLow(true)
                .build(),
        )
        .build()

    workManager.enqueueUniquePeriodicWork(
        "periodic_farm_sync",
        ExistingPeriodicWorkPolicy.KEEP,
        request,
    )
}
```

Minimum `repeatInterval` is 15 minutes. `flexTimeInterval` lets the system bundle execution with other work.

## Expedited work

For user-visible, must-run-soon work (send message, upload photo):

```kotlin
val request = OneTimeWorkRequestBuilder<UploadPhotoWorker>()
    .setInputData(workDataOf(UploadPhotoWorker.KEY_URI to uri.toString()))
    .setExpedited(OutOfQuotaPolicy.RUN_AS_NON_EXPEDITED_WORK_REQUEST)
    .build()
```

Expedited work runs within ~10 minutes, is exempt from Doze, and can show a notification if `getForegroundInfo()` is implemented:

```kotlin
override suspend fun getForegroundInfo(): ForegroundInfo {
    val notification = NotificationCompat.Builder(applicationContext, CHANNEL_ID)
        .setContentTitle("Uploading photo")
        .setSmallIcon(R.drawable.ic_upload)
        .setProgress(0, 0, true)
        .build()
    return ForegroundInfo(NOTIFICATION_ID, notification)
}
```

`OutOfQuotaPolicy.RUN_AS_NON_EXPEDITED_WORK_REQUEST` falls back to normal work when expedited quota is exhausted. Never use `.DROP_WORK_REQUEST` unless silently dropping work is actually acceptable.

## Chaining

```kotlin
workManager
    .beginUniqueWork("full_sync", ExistingWorkPolicy.REPLACE, downloadRequest)
    .then(decompressRequest)
    .then(listOf(indexRequest, thumbnailRequest))
    .then(notifyCompleteRequest)
    .enqueue()
```

Any failure short-circuits the chain. `Data` from one worker's `Result.success(Data)` is the `inputData` of the next.

## Observing work from UI

```kotlin
class SyncStatusViewModel @Inject constructor(
    private val workManager: WorkManager,
) : ViewModel() {

    val syncState: StateFlow<SyncUiState> = workManager
        .getWorkInfosByTagFlow(SyncScheduler.TAG_FARM_SYNC)
        .map { infos ->
            val latest = infos.maxByOrNull { it.generation }
            when (latest?.state) {
                WorkInfo.State.RUNNING -> SyncUiState.Syncing
                WorkInfo.State.SUCCEEDED -> SyncUiState.Synced(latest.outputData.getLong(KEY_SYNCED_COUNT, 0))
                WorkInfo.State.FAILED -> SyncUiState.Failed
                WorkInfo.State.CANCELLED -> SyncUiState.Idle
                else -> SyncUiState.Idle
            }
        }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), SyncUiState.Idle)
}
```

Prefer `getWorkInfosByTagFlow` over `LiveData` -- one less library, lifecycle-aware at collection.

## Testing

```kotlin
@RunWith(AndroidJUnit4::class)
class SyncFarmsWorkerTest {

    private lateinit var context: Context
    private val fakeRepo = FakeFarmRepository()
    private val fakeAuth = FakeAuthRepository(signedIn = true)

    @Before
    fun setUp() {
        context = ApplicationProvider.getApplicationContext()
    }

    @Test
    fun `success with valid input`() = runTest {
        val worker = TestListenableWorkerBuilder<SyncFarmsWorker>(context)
            .setInputData(workDataOf(SyncFarmsWorker.KEY_CLIENT_ID to "client-1"))
            .setWorkerFactory(object : WorkerFactory() {
                override fun createWorker(
                    appContext: Context,
                    workerClassName: String,
                    parameters: WorkerParameters,
                ) = SyncFarmsWorker(appContext, parameters, fakeRepo, fakeAuth)
            })
            .build()

        val result = worker.doWork()
        assertThat(result).isInstanceOf(ListenableWorker.Result.Success::class.java)
    }
}
```

Use `TestListenableWorkerBuilder` for unit tests -- no WorkManager runtime needed. For integration tests, `WorkManagerTestInitHelper.initializeTestWorkManager`.

## Common mistakes

- `@Inject constructor` on a worker. Will crash at reflection instantiation. Must be `@HiltWorker` + `@AssistedInject`.
- Enqueueing the same unique work with `REPLACE` when `KEEP` is correct -- causes cancellation of in-progress syncs.
- Returning `Result.failure` on network errors. Use `Result.retry` with a bounded `runAttemptCount` check.
- Reading LiveData `getWorkInfosByTagLiveData` in new code. Use `getWorkInfosByTagFlow`.
- Forgetting `getForegroundInfo()` on expedited work that should show a notification -- the user loses visibility.
- Running long work on the default dispatcher. `CoroutineWorker` uses `Dispatchers.Default`; move I/O to `Dispatchers.IO` explicitly.
- Not removing the `WorkManagerInitializer` meta-data when using `Configuration.Provider`. The default initializer wins and Hilt factory is ignored.

## Cross-references

- Hilt worker wiring: `di-hilt.md`
- Koin worker wiring: `di-koin.md`
- Repository interfaces that workers call: `architecture-patterns.md`
