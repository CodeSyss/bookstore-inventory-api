import logging

from rest_framework.response import Response
from rest_framework.views import exception_handler

logger = logging.getLogger(__name__)

# Django's default 404 text names the model in English ("No Book matches the given query.").
NOT_FOUND_MESSAGE = "No se encontró el recurso solicitado."

ERROR_CODES = {
    400: "validation_error",
    404: "not_found",
    405: "method_not_allowed",
    503: "service_unavailable",
}


def custom_exception_handler(exc, context):
    response = exception_handler(exc, context)

    if response is None:
        # Excepción no controlada → 500 sin exponer detalles internos
        logger.exception("Unhandled error", exc_info=exc)
        return Response(
            {"status": 500, "error": "internal_error", "message": "Error interno del servidor.", "details": None},
            status=500,
        )

    detail = response.data
    message = detail.get("detail") if isinstance(detail, dict) and "detail" in detail else "Datos inválidos."
    if response.status_code == 404:
        message = NOT_FOUND_MESSAGE
    response.data = {
        "status": response.status_code,
        "error": ERROR_CODES.get(response.status_code, "error"),
        "message": str(message),
        "details": None if isinstance(detail, dict) and "detail" in detail else detail,
    }
    return response
