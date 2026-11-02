from unittest.mock import patch

from fastapi.testclient import TestClient

from app.embedding_model import EMBEDDING_DIMENSIONS, MODEL_NAME
from app.main import app

client = TestClient(app)


def test_model_info_describes_local_cpu_model():
    response = client.get("/model/info")
    assert response.status_code == 200
    assert response.json()["dimensions"] == EMBEDDING_DIMENSIONS
    assert response.json()["provider"] == "local"


def test_embeddings_endpoint_returns_vectors():
    fake_vectors = [[0.25] * EMBEDDING_DIMENSIONS]
    with patch("app.main.embed_texts", return_value=fake_vectors) as embed:
        response = client.post(
            "/embeddings",
            json={"texts": ["  How do I return an order?  "]},
        )

    assert response.status_code == 200
    body = response.json()
    assert body["model"] == MODEL_NAME
    assert body["dimensions"] == EMBEDDING_DIMENSIONS
    assert body["count"] == 1
    assert len(body["embeddings"][0]) == EMBEDDING_DIMENSIONS
    embed.assert_called_once_with(["How do I return an order?"])


def test_embeddings_endpoint_rejects_empty_batch():
    assert client.post("/embeddings", json={"texts": []}).status_code == 422


def test_embeddings_endpoint_rejects_blank_text():
    assert client.post("/embeddings", json={"texts": ["   "]}).status_code == 422


def test_embeddings_endpoint_rejects_more_than_32_texts():
    assert client.post("/embeddings", json={"texts": ["hello"] * 33}).status_code == 422


def test_embeddings_endpoint_rejects_text_over_2000_characters():
    assert client.post("/embeddings", json={"texts": ["x" * 2001]}).status_code == 422


def test_embeddings_endpoint_returns_503_on_model_error():
    with patch("app.main.embed_texts", side_effect=RuntimeError("model failed")):
        response = client.post("/embeddings", json={"texts": ["hello"]})
    assert response.status_code == 503
