from django.shortcuts import render


def landing(request):
    return render(request, 'pages/landing.html')


def terms(request):
    return render(request, 'pages/terms.html')


def privacy(request):
    return render(request, 'pages/privacy.html')
