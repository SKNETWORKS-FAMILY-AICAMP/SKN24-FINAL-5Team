from django.urls import path
from . import views

app_name = 'credits'

urlpatterns = [
    path('charge/', views.credit_charge, name='credit_charge'),
    path('history/', views.credit_history, name='credit_history'),
    path('payments/prepare/', views.payment_prepare, name='payment_prepare'),
    path('payments/success/', views.payment_success, name='payment_success'),
    path('payments/fail/', views.payment_fail, name='payment_fail'),
    path('payments/cancel-demo/', views.payment_cancel_demo, name='payment_cancel_demo'),
    path('use/', views.credit_use, name='credit_use'),
]
