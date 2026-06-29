from django.conf import settings
from django.db import models


class Plan(models.Model):
    plan_id = models.AutoField(primary_key=True)
    credit_amount = models.IntegerField()
    price = models.IntegerField()

    class Meta:
        db_table = 'plan'

    def __str__(self):
        return f'{self.credit_amount:,}C / {self.price:,}원'


class Payment(models.Model):
    STATUS_CHOICES = [
        ('PAID', 'PAID'),
        ('FAILED', 'FAILED'),
        ('CANCELED', 'CANCELED'),
    ]

    payment_id = models.CharField(max_length=64, primary_key=True)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        db_column='user_id',
        related_name='payments',
    )
    plan = models.ForeignKey(
        Plan,
        on_delete=models.PROTECT,
        db_column='plan_id',
        related_name='payments',
    )
    amount = models.IntegerField()
    status = models.CharField(max_length=10, choices=STATUS_CHOICES)
    payment_key = models.CharField(max_length=200)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'payments'

    def __str__(self):
        return f'{self.payment_id} ({self.status})'


class CreditTransaction(models.Model):
    TYPE_CHOICES = [
        ('CHARGE', 'CHARGE'),
        ('USE', 'USE'),
        ('REFUND', 'REFUND'),
        ('CANCEL', 'CANCEL'),
    ]

    transaction_id = models.AutoField(primary_key=True)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        db_column='user_id',
        related_name='credit_transactions',
    )
    transaction_type = models.CharField(max_length=10, choices=TYPE_CHOICES)
    feature_name = models.CharField(max_length=20)
    change_amount = models.IntegerField()
    balance_after = models.IntegerField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'credit_transaction'

    def __str__(self):
        return f'{self.transaction_type} {self.change_amount:+}C -> {self.balance_after}C'
