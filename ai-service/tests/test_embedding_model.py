from unittest.mock import Mock, patch

import pytest

from app.embedding_model import EMBEDDING_DIMENSIONS, embed_texts


def test_embed_texts_returns_empty_list_without_loading_model() -> None:
    with patch("app.embedding_model.get_embedding_model") as get_model:
        assert embed_texts([]) == []
        get_model.assert_not_called()


@pytest.mark.parametrize("texts", [[""], ["   "], ["valid", "  "]])
def test_embed_texts_rejects_blank_input(texts: list[str]) -> None:
    with pytest.raises(ValueError, match="must not be empty"):
        embed_texts(texts)


def test_embed_texts_uses_cpu_model_and_normalized_vectors() -> None:
    fake_model = Mock()
    fake_model.encode.return_value.tolist.return_value = [
        [0.1] * EMBEDDING_DIMENSIONS
    ]

    with patch("app.embedding_model.get_embedding_model", return_value=fake_model):
        result = embed_texts(["  order refund policy  "])

    assert len(result) == 1
    assert len(result[0]) == EMBEDDING_DIMENSIONS
    fake_model.encode.assert_called_once_with(
        ["order refund policy"],
        batch_size=8,
        convert_to_numpy=True,
        normalize_embeddings=True,
        show_progress_bar=False,
    )
