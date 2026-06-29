from django.urls import path
from . import views

app_name = 'characters'

urlpatterns = [
    path('characters/', views.character_list, name='list'),
    path('characters/extract/', views.character_extract, name='extract'),
    path('characters/<int:work_pk>/saved/', views.character_saved, name='saved'),
    path('characters/<int:work_pk>/save/', views.character_save, name='save'),
]
