server

- GET /collection/hashes
- GET /collection?buckets=1,2,3
- POST /collection

client
Pulling data from the server

1. Get remote hashes (GET /collection/hashes)
2. Get local hashes (store.getHashes())
3. Diff remote and local hashes (diffHashes(remoteHashes, localHashes))
4. Request changed buckets from server (GET /collection?buckets=1,2,3)

Pushing data to the server

1. Get remote hashes (GET /collection/hashes)
2. Get local hashes (store.getHashes())
3. Diff remote and local hashes (diffHashes(remoteHashes, localHashes))
4. Send changed buckets to the server (POST /collection)
