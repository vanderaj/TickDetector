# Phelbore's Tick Detector

## Installation

### Install SQLite3

```shell
sudo apt install sqlite3
```

### Create the SQLite3 database

```shell
sqlite3 systems.sqlitedb < schema.sql
```

## Running the tick detector

### Run EDDN.js

```shell
node EDDN.js
```

### Run tick API

```shell
node tick.ts
```

### Run tick detector

```shell
node detector.ts
```