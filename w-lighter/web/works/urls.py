from django.urls import path
from . import views

app_name = 'works'

urlpatterns = [
    path('works/', views.library, name='library'),
    path('works/create/', views.work_create, name='work_create'),
    path('works/<int:pk>/', views.work_detail, name='work_detail'),
    path('works/<int:pk>/update/', views.work_update, name='work_update'),
    path('works/<int:pk>/delete/', views.work_delete, name='work_delete'),
    path('works/<int:pk>/set-cover/', views.work_set_cover, name='work_set_cover'),
    path('works/<int:work_pk>/episodes/new/', views.episode_register, name='episode_register'),
    path('works/<int:work_pk>/episodes/<int:episode_pk>/', views.episode_detail, name='episode_detail'),
    path('works/<int:work_pk>/episodes/<int:episode_pk>/translate/', views.episode_translate, name='episode_translate'),
    path('works/<int:work_pk>/episodes/<int:episode_pk>/translate-run/', views.episode_translate_run, name='episode_translate_run'),
    path('works/<int:work_pk>/episodes/<int:episode_pk>/inspect-chat/', views.episode_inspect_chat, name='episode_inspect_chat'),
    path('works/<int:work_pk>/episodes/<int:episode_pk>/translations/', views.episode_translations, name='episode_translations'),
    path('works/<int:work_pk>/episodes/<int:episode_pk>/chat/', views.episode_chat, name='episode_chat'),
    path('works/<int:work_pk>/episodes/<int:episode_pk>/translation-save/', views.episode_translation_save, name='episode_translation_save'),
    path('works/<int:work_pk>/episodes/<int:episode_pk>/translation-delete/', views.episode_translation_delete, name='episode_translation_delete'),
    path('works/<int:work_pk>/episodes/<int:episode_pk>/report-check-save/', views.episode_report_check_save, name='episode_report_check_save'),
    path('works/<int:work_pk>/episodes/<int:episode_pk>/edit/', views.episode_edit, name='episode_edit'),
    path('works/<int:work_pk>/episodes/<int:episode_pk>/delete/', views.episode_delete, name='episode_delete'),
]
