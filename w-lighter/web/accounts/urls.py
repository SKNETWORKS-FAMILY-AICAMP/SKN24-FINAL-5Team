from django.urls import path
from . import views

app_name = 'accounts'

urlpatterns = [
    path('<str:provider>/login/', views.oauth_login, name='oauth_login'),
    path('<str:provider>/callback/', views.oauth_callback, name='oauth_callback'),
    path('signup/terms/', views.signup_terms, name='signup_terms'),
    path('signup/name/', views.signup_name, name='signup_name'),
    path('update-nickname/', views.update_nickname, name='update_nickname'),
    path('logout/', views.logout_view, name='logout'),
    path('withdraw/', views.withdraw, name='withdraw'),
    path('withdraw/complete/', views.withdraw_complete, name='withdraw_complete'),
]
