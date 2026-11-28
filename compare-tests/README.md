# Comparison tests

Proves that the Java backend behaves like the Node backend: the same requests go
to both servers, and the answers, the database changes and the emails must match.

Everything runs on this computer with empty, throwaway databases. No real data
and no real email service is ever used.

## Run

Needs Docker running, and `npm install` done once in `server/`. For Java, build it first:
`cd server-java && ./mvnw package`.

```bash
node compare-tests/run.js                 # Node against Node (must show 0)
node compare-tests/run.js --b java --only foundation --only seeded
                                           # Node against Java, the parts written so far
node compare-tests/run.js --sabotage      # must report differences
node compare-tests/cross.js               # both servers on one database
```

The exit code is 0 only when there are no differences, every request got the
expected status, and every endpoint had a successful request.

## What is compared

- status code and the security, caching, CORS and rate-limit headers
- the answer, including how numbers are written (`8` is not `8.0`)
- every record added, changed or removed, including number types in the database
  and which fields moved (for example `updatedAt`)
- emails: receiver, subject and text

Ids, times, tokens, password fingerprints and emailed codes are replaced by
labels first, because two servers can never produce the same ones.

## Add a test

Add a step to a file in `scenarios/`. Each scenario starts with empty databases.
A `db` step writes straight into both databases, for old data or expired codes.
