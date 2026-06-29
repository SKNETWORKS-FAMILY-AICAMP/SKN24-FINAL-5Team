from django.urls import path
from . import views

app_name = 'guides'

urlpatterns = [
    path('', views.localization, name='localization'),
    path('generate/', views.guide_generate, name='guide_generate'),
    path('<int:work_pk>/saved/', views.guide_saved, name='guide_saved'),
    path('<int:work_pk>/delete/', views.guide_delete, name='guide_delete'),
]
