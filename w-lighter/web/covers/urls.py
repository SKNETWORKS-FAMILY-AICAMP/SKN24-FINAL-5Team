from django.urls import path
from . import views

app_name = 'covers'

urlpatterns = [
    path('', views.cover_image, name='cover_image'),
    path('generate/', views.cover_generate, name='cover_generate'),
    path('<int:work_pk>/saved/', views.cover_saved, name='cover_saved'),
    path('<int:work_pk>/delete/', views.cover_delete, name='cover_delete'),
]