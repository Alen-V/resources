# Architecture Patterns

UDF is the baseline. MVI, MVVM, and Redux-style reducers are variations on top. Present options, don't mandate.

## UDF baseline

Unidirectional data flow: state flows down, events flow up.

```
Repository --StateFlow--> ViewModel --StateFlow<UiState>--> Composable
                              ^                                  |
                              |------ events/intents/actions -----|
```

Key rules:
- UI owns no business state; it renders what it's given.
- ViewModel owns `StateFlow<UiState>`. Never `MutableState` in ViewModels.
- Repositories own cross-cutting data; expose `Flow<DomainModel>`.
- Events are commands from UI to ViewModel (function calls or an `onEvent: (Event) -> Unit` slot).

## Pattern: MVVM + Repository (default for most apps)

```kotlin
data class FarmListUiState(
    val farms: List<FarmSummary> = emptyList(),
    val loading: Boolean = true,
    val error: String? = null,
)

@HiltViewModel
class FarmListViewModel @Inject constructor(
    private val farmRepository: FarmRepository,
    private val authRepository: AuthRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(FarmListUiState())
    val uiState: StateFlow<FarmListUiState> = _uiState.asStateFlow()

    init {
        viewModelScope.launch {
            authRepository.currentClient.flatMapLatest { client ->
                if (client == null) flowOf(emptyList())
                else farmRepository.observeFarms(client.id)
            }
            .catch { e -> _uiState.update { it.copy(loading = false, error = e.message) } }
            .collect { farms ->
                _uiState.update { it.copy(farms = farms.map(::toSummary), loading = false) }
            }
        }
    }

    fun refresh() {
        viewModelScope.launch {
            runCatching { farmRepository.refresh() }
                .onFailure { e -> _uiState.update { it.copy(error = e.message) } }
        }
    }
}
```

| When it fits | When it breaks down |
|--------------|---------------------|
| Most CRUD screens | Complex state machines (N tabs, M tools, L overlays) |
| Small/medium features | Intricate undo/redo |
| Teams new to Compose | Heavy multi-step wizards |

## Pattern: MVI (State + Intent + Effect)

Single state object, typed intents, one-shot effects.

```kotlin
data class CreateRecordState(
    val draft: RecordDraft = RecordDraft(),
    val saving: Boolean = false,
    val validationErrors: Map<String, String> = emptyMap(),
)

sealed interface CreateRecordIntent {
    data class UpdateField(val id: String, val value: String) : CreateRecordIntent
    data object Submit : CreateRecordIntent
    data object Cancel : CreateRecordIntent
}

sealed interface CreateRecordEffect {
    data class Saved(val id: RecordId) : CreateRecordEffect
    data class Error(val message: String) : CreateRecordEffect
    data object NavigateBack : CreateRecordEffect
}

@HiltViewModel
class CreateRecordViewModel @Inject constructor(
    private val recordRepository: RecordRepository,
) : ViewModel() {

    private val _state = MutableStateFlow(CreateRecordState())
    val state: StateFlow<CreateRecordState> = _state.asStateFlow()

    private val _effects = Channel<CreateRecordEffect>(Channel.BUFFERED)
    val effects: Flow<CreateRecordEffect> = _effects.receiveAsFlow()

    fun onIntent(intent: CreateRecordIntent) {
        when (intent) {
            is CreateRecordIntent.UpdateField -> reduce { copy(draft = draft.update(intent.id, intent.value)) }
            is CreateRecordIntent.Submit -> submit()
            is CreateRecordIntent.Cancel -> viewModelScope.launch { _effects.send(CreateRecordEffect.NavigateBack) }
        }
    }

    private fun submit() {
        val current = _state.value.draft
        val errors = validate(current)
        if (errors.isNotEmpty()) {
            reduce { copy(validationErrors = errors) }
            return
        }
        viewModelScope.launch {
            reduce { copy(saving = true) }
            runCatching { recordRepository.create(current) }
                .onSuccess { _effects.send(CreateRecordEffect.Saved(it)) }
                .onFailure { _effects.send(CreateRecordEffect.Error(it.message ?: "Save failed")) }
            reduce { copy(saving = false) }
        }
    }

    private inline fun reduce(block: CreateRecordState.() -> CreateRecordState) {
        _state.update(block)
    }
}
```

UI collects state and effects separately:

```kotlin
@Composable
fun CreateRecordScreen(viewModel: CreateRecordViewModel, onDone: () -> Unit) {
    val state by viewModel.state.collectAsStateWithLifecycle()

    LaunchedEffect(Unit) {
        viewModel.effects.flowWithLifecycle(lifecycle).collect { effect ->
            when (effect) {
                is CreateRecordEffect.Saved, CreateRecordEffect.NavigateBack -> onDone()
                is CreateRecordEffect.Error -> showError(effect.message)
            }
        }
    }

    CreateRecordForm(state = state, onIntent = viewModel::onIntent)
}
```

| When it fits | When it's overkill |
|--------------|---------------------|
| Complex multi-field forms | One-field settings screens |
| Undoable/replayable interactions | Read-only list views |
| Multi-team features with strict API boundaries | Small apps |
| Needs time-travel debugging | |

## Pattern: Repository

Every data source is behind an interface. UI never calls Retrofit / Room / DataStore directly.

```kotlin
interface FarmRepository {
    fun observeFarms(clientId: ClientId): Flow<List<Farm>>
    fun observeFarm(id: FarmId): Flow<Farm?>
    suspend fun create(draft: FarmDraft): Farm
    suspend fun update(farm: Farm)
    suspend fun delete(id: FarmId)
    suspend fun refresh()
}

class FarmRepositoryImpl @Inject constructor(
    private val farmDao: FarmDao,
    private val farmApi: FarmApi,
    @IoDispatcher private val io: CoroutineDispatcher,
) : FarmRepository {

    override fun observeFarms(clientId: ClientId): Flow<List<Farm>> =
        farmDao.observeFarmsForClient(clientId.value)
            .map { it.map(FarmEntity::toDomain) }
            .flowOn(io)

    override suspend fun refresh() = withContext(io) {
        val remote = farmApi.listFarms()
        farmDao.upsert(remote.map(FarmDto::toEntity))
    }
}
```

### Single source of truth (offline-first)

Room is the SSoT. Remote calls update Room; UI observes Room.

```
API ---refresh()--> Room (SSoT) <--observe-- ViewModel <-- UI
```

Never return API responses directly to UI. The repository decides "fresh from network or cached from DB" and exposes a single Flow.

## UseCase / Interactor layer

Optional. Adds a thin layer between ViewModel and Repository.

```kotlin
class ObserveFarmOverview @Inject constructor(
    private val farmRepository: FarmRepository,
    private val fieldRepository: FieldRepository,
    private val recordRepository: RecordRepository,
) {
    operator fun invoke(farmId: FarmId): Flow<FarmOverview> = combine(
        farmRepository.observeFarm(farmId),
        fieldRepository.observeFieldsForFarm(farmId),
        recordRepository.observeRecentRecords(farmId, limit = 10),
    ) { farm, fields, records ->
        FarmOverview(farm, fields, records)
    }
}
```

| Worth it | Overkill |
|----------|----------|
| Logic reused across 3+ ViewModels | One ViewModel uses it |
| Combines multiple repositories | Wraps a single repository call |
| Has meaningful domain logic | `return repo.observe(id)` |

Do not add a UseCase for every ViewModel method. That's ceremony, not architecture.

## Result types

Prefer sealed types over exceptions for expected failure modes.

```kotlin
sealed interface LoadResult<out T> {
    data class Success<T>(val value: T) : LoadResult<T>
    data class Failure(val error: DataError) : LoadResult<Nothing>
    data object Loading : LoadResult<Nothing>
}

sealed interface DataError {
    data object Network : DataError
    data object NotFound : DataError
    data object Unauthorized : DataError
    data class Unknown(val message: String) : DataError
}
```

Use `Result<T>` (stdlib) for internal chaining; use a typed sealed `LoadResult`/`DataError` at UI boundaries so screens can render branches without string-matching messages.

## Decision table

| Situation | Pattern |
|-----------|---------|
| Small/medium app, mostly CRUD | MVVM + Repository |
| Complex form state, undo/redo | MVI |
| Offline-first, realtime sync | Repository as SSoT + MVVM or MVI |
| One feature with an elaborate state machine | MVI in that feature; MVVM elsewhere |
| Large team, strict API contracts | MVI + UseCase layer |
| Prototype / hackathon | MVVM, no UseCase layer |

Mix patterns per feature. There is no rule that the whole app must pick one.

## Common mistakes

- Putting business logic in composables. Move to the ViewModel; test there.
- Exposing `MutableStateFlow` from a ViewModel. Always expose `StateFlow` via `.asStateFlow()`.
- Swallowing errors into a boolean `hasError`. Use a typed error so the UI can differentiate.
- UseCase for every ViewModel method. Cargo-culted complexity.
- Repositories that return `LiveData`. Use `Flow`.
- Passing a ViewModel down through multiple composables. Hoist state + callbacks; keep VMs at screen root.

## Cross-references

- Event/effect collection with lifecycle: `lifecycle.md`
- State hoisting, `collectAsStateWithLifecycle`: `jetpack-compose-expert` skill
- Sealed class modeling, Result types: `kotlin-idioms` skill
