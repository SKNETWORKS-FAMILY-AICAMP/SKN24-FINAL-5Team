from django.urls import path
from . import views

app_name = 'relationships'

urlpatterns = [
    path('', views.relationship, name='relationship'),
    path('generate/', views.relationship_map, name='relationship_map'),
    path('<int:work_pk>/saved/', views.relationship_saved, name='relationship_saved'),
    path('<int:work_pk>/delete/', views.relationship_delete, name='relationship_delete'),
    path('<int:work_pk>/positions/', views.relationship_positions, name='relationship_positions'),
]