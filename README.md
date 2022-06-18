# Phelbore's Tick Detector

The modernization of the original Elite Dangerous tick detector has been ported to TypeScript and Go.

The Go version is likely going to be faster and more reliable. The TypeScript version ... less so

## What each thing does:

### eddn-listener

This listens to EDDN and places relevant system updates into the RAW table.

### tick-detector

This is a background process that periodically samples data from the database to determine if the tick has been through. It does this using the DBSCAN algorithm, which such advanced technology, it is basically magic. Don't ask me how it works. There's an explanation of cluster distributions in Corman et al fourth edition and I'm still none the wiser. 

### tick-server

tick-server serves requests from end users, providing a lightweight API including a human readable webpage if just called directly. 

| API | Description |
| -- | -- |
| / | Human readable version of the last tick |
| /allTicks | json output of the last 30 ticks |
| /license | license file |
