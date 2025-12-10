# Using SQLite Instead of MongoDB

If you want a **file-based database** (no server needed), SQLite is a great option.

## Why SQLite?

✅ **No server** - Just a file on disk  
✅ **Zero configuration** - Works out of the box  
✅ **Fast queries** - Full SQL support  
✅ **Relationships** - Foreign keys, joins  
✅ **Small footprint** - Perfect for small apps  

## Migration Effort

⚠️ **Moderate code changes required:**
- Replace Mongoose with a SQLite ORM (like TypeORM or Sequelize)
- Convert schemas to SQL tables
- Update queries to SQL syntax
- Migrate existing data

**Estimated time:** 1-2 days of development

## Setup

```bash
npm install better-sqlite3
# or
npm install sqlite3
```

## Recommendation

SQLite is great if you:
- Want to avoid managing a database server
- Have a single-server deployment
- Don't need horizontal scaling

**Note:** SQLite doesn't work well for multi-server deployments (each server would have its own database file).

