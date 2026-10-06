from rest_framework.routers import DefaultRouter

from .views import BookViewSet

router = DefaultRouter(trailing_slash=False)
router.register("books", BookViewSet, basename="book")

urlpatterns = router.urls
