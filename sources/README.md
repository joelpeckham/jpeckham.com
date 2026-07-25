# Local reference sources

## MySQL 9.7 Reference Manual

Oracle’s MySQL Reference Manual is the primary source for the Learn MySQL series. It is **not** GPL-licensed and must not be committed or redistributed.

### Fetch (local only)

```bash
npm run refman:fetch
```

This downloads the official Info archive, splits it into searchable node files, and writes:

- `sources/mysql-refman-9.7/raw/mysql-9.7.info`
- `sources/mysql-refman-9.7/nodes/<node-id>.md`
- `sources/mysql-refman-9.7/index.json`
- `sources/mysql-refman-9.7/LICENSE-NOTICE.md`

The `sources/mysql-refman-*/` trees are gitignored.

### Search

```bash
rg -n "JOIN" sources/mysql-refman-9.7/nodes
rg -n "^title:" sources/mysql-refman-9.7/nodes/select.md
```

### Cite the official HTML

Node ids match the public docs. For node `select`:

https://dev.mysql.com/doc/refman/9.7/en/select.html

Use the manual as a reference while writing original teaching posts — do not paste Oracle text into published MDX.

### License reminder

See [Preface and Legal Notices](https://dev.mysql.com/doc/refman/9.7/en/preface.html). Personal use and format conversion are allowed if the content is unaltered; publishing or redistributing the documentation requires Oracle’s consent.
