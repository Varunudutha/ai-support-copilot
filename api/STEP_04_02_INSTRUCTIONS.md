# Step 04.2 - MongoDB Atlas Vector Search

## Index configuration

Database: ai-support-copilot
Collection: knowledgechunks
Index name: knowledge_chunks_vector_index
Index type: Vector Search

The JSON definition is in:
api/atlas/knowledge_chunks_vector_index.json

In MongoDB Atlas:
1. Open your cluster and database.
2. Select the knowledgechunks collection.
3. Open Search / Vector Search indexes.
4. Create a Vector Search index.
5. Set the index name to knowledge_chunks_vector_index.
6. Select JSON Editor and paste the supplied index definition.
7. Create the index.
8. Wait until its status is READY before testing search.

## API

POST /api/workspaces/:workspaceId/knowledge-documents/search

Authorization:
Bearer access token

Header:
X-Workspace-Id: your workspace ID

JSON body:
{
  "query": "How can I return an order?",
  "limit": 5
}

The limit must be between 1 and 10.
The query must contain at least 3 characters.

The API:
1. Generates a query embedding using the same local MiniLM model.
2. Runs MongoDB Atlas Vector Search.
3. Filters results by the authenticated workspace ID.
4. Returns the matching chunks, source metadata, and similarity scores.

The AI service must be running.
The Atlas Vector Search index must be READY.

## Notes

The vector index uses 384 dimensions and cosine similarity.
It indexes workspaceId as a filter field for tenant isolation.
No paid embedding API is used.