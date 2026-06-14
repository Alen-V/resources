# Room Database

Room 2.7+ with KSP. The default local relational store.

## Setup

```kotlin
plugins {
    id("com.google.devtools.ksp")
}

dependencies {
    implementation("androidx.room:room-runtime:2.7.0")
    implementation("androidx.room:room-ktx:2.7.0")
    ksp("androidx.room:room-compiler:2.7.0")
    implementation("androidx.room:room-paging:2.7.0")
    testImplementation("androidx.room:room-testing:2.7.0")
}

ksp {
    arg("room.schemaLocation", "$projectDir/schemas")
    arg("room.incremental", "true")
}

android {
    sourceSets.getByName("androidTest").assets.srcDir("$projectDir/schemas")
}
```

Schema export is required for migration tests and CI schema diffs. Commit the `schemas/` directory.

## Entity

```kotlin
@Entity(
    tableName = "farms",
    indices = [Index("client_id"), Index(value = ["slug"], unique = true)],
    foreignKeys = [ForeignKey(
        entity = ClientEntity::class,
        parentColumns = ["id"],
        childColumns = ["client_id"],
        onDelete = ForeignKey.CASCADE,
    )],
)
data class FarmEntity(
    @PrimaryKey val id: String,
    @ColumnInfo(name = "client_id") val clientId: String,
    val name: String,
    val slug: String,
    @ColumnInfo(name = "created_at") val createdAt: Long,
    @ColumnInfo(name = "location_lat") val locationLat: Double?,
    @ColumnInfo(name = "location_lng") val locationLng: Double?,
)
```

| Decision | Recommendation |
|----------|----------------|
| Primary key type | `String` (UUID/ULID from backend) or `Long` (autogen) |
| Foreign keys | Add them for referential integrity + cascade |
| Indices | Always on FK columns; uniques marked `unique = true` |
| `@ColumnInfo(name = ...)` | Use snake_case column names to match SQL convention |

## DAO

```kotlin
@Dao
interface FarmDao {
    @Query("SELECT * FROM farms WHERE client_id = :clientId ORDER BY name")
    fun observeFarmsForClient(clientId: String): Flow<List<FarmEntity>>

    @Query("SELECT * FROM farms WHERE id = :id")
    fun observeFarm(id: String): Flow<FarmEntity?>

    @Query("SELECT * FROM farms WHERE id = :id")
    suspend fun getFarm(id: String): FarmEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(farms: List<FarmEntity>)

    @Update
    suspend fun update(farm: FarmEntity)

    @Delete
    suspend fun delete(farm: FarmEntity)

    @Query("DELETE FROM farms WHERE id = :id")
    suspend fun deleteById(id: String)

    @Transaction
    @Query("SELECT * FROM farms WHERE id = :id")
    fun observeFarmWithFields(id: String): Flow<FarmWithFields?>
}
```

| Return type | When |
|-------------|------|
| `Flow<T>` | Reactive reads (UI) -- Room emits on any change to queried tables |
| `suspend fun T` | One-shot reads/writes (non-UI workflows, initial loads) |
| `PagingSource<Int, T>` | Paged lists (see below) |
| Non-suspend `T` | Never. Blocks the main thread. |

## Relations

```kotlin
data class FarmWithFields(
    @Embedded val farm: FarmEntity,
    @Relation(parentColumn = "id", entityColumn = "farm_id")
    val fields: List<FieldEntity>,
)

@Transaction
@Query("SELECT * FROM farms WHERE id = :id")
fun observeFarmWithFields(id: String): Flow<FarmWithFields?>
```

`@Transaction` is required on `@Relation` queries -- Room runs child-table lookups in the same transaction to avoid inconsistent reads.

## Type converters

```kotlin
class NumanacTypeConverters {
    @TypeConverter
    fun fromInstant(value: Instant?): Long? = value?.toEpochMilli()

    @TypeConverter
    fun toInstant(value: Long?): Instant? = value?.let(Instant::ofEpochMilli)

    @TypeConverter
    fun fromRecordKind(kind: RecordKind?): String? = kind?.name

    @TypeConverter
    fun toRecordKind(value: String?): RecordKind? = value?.let(RecordKind::valueOf)
}
```

Register on the database:

```kotlin
@Database(entities = [FarmEntity::class, FieldEntity::class], version = 3, exportSchema = true)
@TypeConverters(NumanacTypeConverters::class)
abstract class NumanacDatabase : RoomDatabase() {
    abstract fun farmDao(): FarmDao
    abstract fun fieldDao(): FieldDao
}
```

## Database provider

```kotlin
@Module
@InstallIn(SingletonComponent::class)
object DatabaseModule {
    @Provides
    @Singleton
    fun provideDatabase(@ApplicationContext context: Context): NumanacDatabase =
        Room.databaseBuilder(context, NumanacDatabase::class.java, "numanac.db")
            .addMigrations(MIGRATION_1_2, MIGRATION_2_3)
            .fallbackToDestructiveMigration(dropAllTables = false)
            .build()

    @Provides fun provideFarmDao(db: NumanacDatabase): FarmDao = db.farmDao()
    @Provides fun provideFieldDao(db: NumanacDatabase): FieldDao = db.fieldDao()
}
```

Never call `fallbackToDestructiveMigration` without `dropAllTables = false` in production -- default wipes user data. For most apps, write real migrations.

## Migrations

```kotlin
val MIGRATION_1_2 = Migration(1, 2) { db ->
    db.execSQL("ALTER TABLE farms ADD COLUMN location_lat REAL")
    db.execSQL("ALTER TABLE farms ADD COLUMN location_lng REAL")
}

val MIGRATION_2_3 = Migration(2, 3) { db ->
    db.execSQL("""
        CREATE TABLE IF NOT EXISTS tracts (
            id TEXT NOT NULL PRIMARY KEY,
            farm_id TEXT NOT NULL,
            name TEXT NOT NULL,
            FOREIGN KEY (farm_id) REFERENCES farms(id) ON DELETE CASCADE
        )
    """)
    db.execSQL("CREATE INDEX index_tracts_farm_id ON tracts(farm_id)")
}
```

### Migration test

```kotlin
@RunWith(AndroidJUnit4::class)
class FarmMigrationTest {
    private val helper = MigrationTestHelper(
        InstrumentationRegistry.getInstrumentation(),
        NumanacDatabase::class.java,
    )

    @Test
    fun migrate_1_to_2_preserves_data() {
        helper.createDatabase(DB_NAME, 1).apply {
            execSQL("INSERT INTO farms (id, client_id, name, slug, created_at) VALUES ('f1', 'c1', 'North', 'north', 0)")
            close()
        }

        val migrated = helper.runMigrationsAndValidate(DB_NAME, 2, true, MIGRATION_1_2)

        migrated.query("SELECT name, location_lat FROM farms WHERE id = 'f1'").use { c ->
            c.moveToFirst()
            assertThat(c.getString(0)).isEqualTo("North")
            assertThat(c.isNull(1)).isTrue()
        }
    }

    companion object { const val DB_NAME = "migration-test.db" }
}
```

Every migration needs a test. CI should fail if schemas are out of date.

## Paging 3

```kotlin
@Dao
interface RecordDao {
    @Query("SELECT * FROM records WHERE farm_id = :farmId ORDER BY created_at DESC")
    fun pagingRecordsForFarm(farmId: String): PagingSource<Int, RecordEntity>
}

class RecordRepository @Inject constructor(private val dao: RecordDao) {
    fun pagingRecords(farmId: String): Flow<PagingData<Record>> =
        Pager(
            config = PagingConfig(pageSize = 50, enablePlaceholders = false),
            pagingSourceFactory = { dao.pagingRecordsForFarm(farmId) },
        )
        .flow
        .map { paging -> paging.map { it.toDomain() } }
}
```

Collect in Compose with `LazyPagingItems` (see `jetpack-compose-expert`'s lists reference).

## Repository layer

UI never imports Room directly. Every DAO flow is mapped to a domain model in a `Repository`:

```kotlin
class FarmRepositoryImpl @Inject constructor(
    private val farmDao: FarmDao,
    private val farmApi: FarmApi,
    @IoDispatcher private val io: CoroutineDispatcher,
) : FarmRepository {

    override fun observeFarms(clientId: ClientId): Flow<List<Farm>> =
        farmDao.observeFarmsForClient(clientId.value)
            .map { entities -> entities.map { it.toDomain() } }
            .flowOn(io)

    override suspend fun refresh(clientId: ClientId) = withContext(io) {
        val remote = farmApi.listFarms(clientId.value)
        farmDao.upsert(remote.map { it.toEntity() })
    }
}
```

Entity <-> domain mapping is explicit, not inferred. Keeps Room out of `:feature:*` modules.

## Common mistakes

- Returning `LiveData` from a DAO in new code. `Flow` is idiomatic; convert to Compose state with `collectAsStateWithLifecycle`.
- Calling a non-suspend DAO method on the main thread. Room throws at runtime -- but don't write the call in the first place.
- `fallbackToDestructiveMigration()` committed to production without `dropAllTables = false` and a user-facing export path. Data loss.
- Forgetting `@Transaction` on a `@Relation` query. You'll get torn reads during concurrent writes.
- Exposing `FarmEntity` through a repository. Domain models should not be auto-bound to storage shape.
- Not committing the `schemas/` directory. Migration tests can't run; CI can't diff schema changes.

## Cross-references

- DI wiring: `di-hilt.md` or `di-koin.md`
- Testing strategy (Robolectric vs instrumented): `testing.md`
- Keeping DAO Flow lifecycle-safe in UI: `lifecycle.md`
