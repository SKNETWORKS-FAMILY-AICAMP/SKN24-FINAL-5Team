import base64
import json
import os
import re
import sys
import uuid
import time
import streamlit.components.v1 as components
from datetime import datetime
from dataclasses import asdict
from html import unescape
from pathlib import Path
from urllib.parse import urlencode
from typing import Any

import requests
from openai import OpenAI
import streamlit as st
from dotenv import load_dotenv


load_dotenv()

TOSS_CLIENT_KEY = os.getenv("TOSS_CLIENT_KEY")
TOSS_SECRET_KEY = os.getenv("TOSS_SECRET_KEY")
STREAMLIT_BASE_URL = os.getenv("STREAMLIT_BASE_URL", "http://localhost:8501")
CHECKOUT_BASE_URL = os.getenv("CHECKOUT_BASE_URL", "http://localhost:5500/checkout.html")

PROJECT_DIR = Path(__file__).resolve().parent
if str(PROJECT_DIR) not in sys.path:
    sys.path.insert(0, str(PROJECT_DIR))

try:


    from ko_locale_pipeline import ChatMessage, KoLocalePipeline, PipelineConfig

    PIPELINE_AVAILABLE = True
except Exception:
    ChatMessage = None
    KoLocalePipeline = None
    PipelineConfig = None
    PIPELINE_AVAILABLE = False

COUNTRY_TO_PIPELINE_LOCALE = {
    "일본": "ko_ja",
    "미국": "ko_en_us",
    "중국": "ko_zh_cn",
    "태국": "ko_th_th",
}


st.set_page_config(
    page_title="w.LiGHTER | Web Novel Localization Studio",
    page_icon="🖋️",
    layout="wide",
    initial_sidebar_state="expanded",
)


st.markdown(
    """
    <style>
        :root {
            --bg: #F6F1EB;
            --surface: #FFF9F7;
            --surface-soft: #F3EEFF;
            --text: #2D2440;
            --muted: #6E638C;
            --line: #B7A9E6;
            --button: #E9E1FF;
            --button-hover: #6E5BB8;
            --button-text: #2D2440;
            --danger-bg: #FFF1F2;
            --danger-line: #F8D7F5;
            --active: #6E5BB8;
            --border-glow: #CFC3FB;
            --glow: #F8D7F5;
        }

        * {
            box-sizing: border-box;
        }

        .stApp {
            background: var(--bg) !important;
            color: var(--text) !important;
        }

        .block-container {
            max-width: 1180px !important;
            padding-top: 1.5rem !important;
            padding-left: 2rem !important;
            padding-right: 2rem !important;
            padding-bottom: 4rem !important;
        }

        h1, h2, h3, h4, h5, h6,
        .stMarkdown h1, .stMarkdown h2, .stMarkdown h3,
        .section-title {
            color: var(--text) !important;
            letter-spacing: -0.04em;
            line-height: 1.25 !important;
        }

        p, li, label,
        .stMarkdown, .stMarkdown p,
        [data-testid="stMarkdownContainer"] {
            color: var(--text) !important;
        }

        .section-title {
            font-size: clamp(1.55rem, 2.2vw, 2.05rem) !important;
            font-weight: 900;
            margin: 0 0 0.45rem !important;
        }

        .section-sub,
        .stCaptionContainer,
        div[data-testid="stCaptionContainer"],
        small {
            color: var(--muted) !important;
            font-size: 0.92rem;
            line-height: 1.65;
        }

        hr {
            border-color: var(--line) !important;
        }

        [data-testid="stSidebar"] {
            background: var(--surface) !important;
            border-right: 1px solid var(--line) !important;
        }

        [data-testid="stSidebar"] * {
            color: var(--text) !important;
        }

        [data-testid="stSidebar"] small,
        [data-testid="stSidebar"] .stCaptionContainer {
            color: var(--muted) !important;
        }

        [data-testid="stSidebar"] [data-testid="stImage"],
        [data-testid="stSidebar"] [data-testid="stImage"] > div,
        [data-testid="stSidebar"] [data-testid="stImage"] figure {
            background: transparent !important;
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
        }

        [data-testid="stSidebar"] img {
            background: transparent !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            filter: none !important;
            margin: 0.2rem 0 0.65rem !important;
        }

        .sidebar-logo-fallback {
            font-size: 30px;
            font-weight: 900;
            color: var(--text) !important;
            letter-spacing: -0.06em;
            padding: 10px 0 2px;
        }

        .sidebar-logo-fallback span {
            color: var(--text) !important;
        }

        .sidebar-subtitle,
        .sidebar-user-email,
        .sidebar-credit-label {
            color: var(--muted) !important;
            font-size: 12px;
            line-height: 1.5;
        }

        .sidebar-section-title {
            margin: 22px 0 10px;
            color: var(--text) !important;
            font-size: 13px;
            font-weight: 900;
            letter-spacing: 0.04em;
        }

        .sidebar-user-card,
        .sidebar-credit-card,
        div[data-testid="stVerticalBlockBorderWrapper"],
        div[data-testid="stForm"],
        .work-card,
        .episode-card,
        .notice-box,
        .soft-empty,
        .review-summary-box,
        .chat-panel,
        .credit-plan-card,
        .credit-summary-card,
        .guide-cover,
        .guide-card {
            background: var(--surface) !important;
            color: var(--text) !important;
            border: 1px solid var(--line) !important;
            border-radius: 18px !important;
            box-shadow: 0 8px 22px rgba(45, 36, 64, 0.08) !important;
        }

        .sidebar-user-card,
        .sidebar-credit-card {
            padding: 0.95rem 1rem;
            margin-bottom: 14px;
        }

        div[data-testid="stForm"] {
            padding: 1rem 1rem 0.35rem !important;
        }

        .sidebar-user-name,
        .sidebar-credit-value,
        .work-title,
        .guide-cover-title,
        .guide-section-title,
        .credit-value,
        .price-highlight .value {
            color: var(--text) !important;
            font-weight: 900;
        }

        [data-testid="stMetric"] {
            background: var(--surface) !important;
            border: 1px solid var(--line) !important;
            border-radius: 18px !important;
            padding: 1rem 1.1rem !important;
            box-shadow: 0 8px 22px rgba(45, 36, 64, 0.08) !important;
        }

        [data-testid="stMetric"] * {
            color: var(--text) !important;
        }

        [data-testid="stMetricLabel"],
        .guide-cover-label,
        .guide-cover-sub,
        .guide-card-title,
        .price-highlight .label,
        .credit-label {
            color: var(--muted) !important;
        }

        .stButton > button,
        div[data-testid="stFormSubmitButton"] button,
        button[kind="primary"],
        button[kind="secondary"],
        .stFileUploader button,
        [data-testid="stFileUploader"] button,
        .pay-button {
            min-height: 42px !important;
            border-radius: 10px !important;
            padding: 0.55rem 0.95rem !important;
            background: var(--button) !important;
            color: var(--button-text) !important;
            -webkit-text-fill-color: var(--button-text) !important;
            border: 1px solid var(--border-glow) !important;
            font-size: 0.92rem !important;
            font-weight: 800 !important;
            letter-spacing: -0.01em !important;
            text-shadow: none !important;
            text-decoration: none !important;
            box-shadow: none !important;
            transition: background 0.15s ease, border-color 0.15s ease, transform 0.15s ease !important;
        }

        .stButton > button *,
        div[data-testid="stFormSubmitButton"] button *,
        button[kind="primary"] *,
        button[kind="secondary"] *,
        .stFileUploader button *,
        [data-testid="stFileUploader"] button * {
            color: var(--button-text) !important;
            -webkit-text-fill-color: var(--button-text) !important;
            fill: var(--button-text) !important;
        }

        .stButton > button:hover,
        div[data-testid="stFormSubmitButton"] button:hover,
        button[kind="primary"]:hover,
        button[kind="secondary"]:hover,
        .stFileUploader button:hover,
        [data-testid="stFileUploader"] button:hover,
        .pay-button:hover {
            background: var(--button-hover) !important;
            border-color: var(--button-hover) !important;
            color: var(--surface) !important;
            -webkit-text-fill-color: var(--surface) !important;
            transform: translateY(-1px) !important;
        }


        .stButton > button:hover *,
        div[data-testid="stFormSubmitButton"] button:hover *,
        button[kind="primary"]:hover *,
        button[kind="secondary"]:hover *,
        .stFileUploader button:hover *,
        [data-testid="stFileUploader"] button:hover * {
            color: var(--surface) !important;
            -webkit-text-fill-color: var(--surface) !important;
            fill: var(--surface) !important;
        }

        .stButton > button:disabled,
        div[data-testid="stFormSubmitButton"] button:disabled {
            background: var(--line) !important;
            color: var(--surface) !important;
            -webkit-text-fill-color: var(--surface) !important;
            border-color: var(--line) !important;
            opacity: 0.75 !important;
        }

        [data-testid="stSidebar"] .stButton > button {
            justify-content: flex-start !important;
            background: var(--surface) !important;
            color: var(--text) !important;
            -webkit-text-fill-color: var(--text) !important;
            border: 1px solid var(--line) !important;
            box-shadow: none !important;
        }

        [data-testid="stSidebar"] .stButton > button * {
            color: var(--text) !important;
            -webkit-text-fill-color: var(--text) !important;
        }

        [data-testid="stSidebar"] .stButton > button:hover {
            background: var(--button-hover) !important;
            border-color: var(--border-glow) !important;
            color: var(--surface) !important;
            -webkit-text-fill-color: var(--surface) !important;
        }

        [data-testid="stSidebar"] .stButton > button:hover * {
            color: var(--surface) !important;
            -webkit-text-fill-color: var(--surface) !important;
            fill: var(--surface) !important;
        }

        .stTextInput [data-baseweb="input"],
        .stTextInput input,
        .stTextArea textarea,
        .stNumberInput [data-baseweb="input"],
        .stNumberInput input,
        .stSelectbox [data-baseweb="select"] > div {
        min-height: 42px !important;
        background-color: var(--surface) !important;
        color: var(--text) !important;
        -webkit-text-fill-color: var(--text) !important;
        caret-color: var(--text) !important;
        border: 1px solid var(--line) !important;
        border-radius: 10px !important;
        text-shadow: none !important;
        box-shadow: none !important;
        }

        .stSelectbox [data-baseweb="select"] input {
        caret-color: transparent !important;
        color: transparent !important;
        -webkit-text-fill-color: transparent !important;
        width: 0 !important;
        min-width: 0 !important;
        padding: 0 !important;
        margin: 0 !important;
        border: none !important;
        outline: none !important;
        box-shadow: none !important;
        }

        .stTextInput [data-baseweb="input"] *,
        .stTextArea textarea,
        .stNumberInput [data-baseweb="input"] *,
        .stSelectbox [data-baseweb="select"] > div *,
        .stSelectbox [data-baseweb="select"] span,
        .stSelectbox [data-baseweb="select"] div {
            color: var(--text) !important;
            -webkit-text-fill-color: var(--text) !important;
            text-shadow: none !important;
        }

        .stTextInput input::placeholder,
        .stTextArea textarea::placeholder,
        .stNumberInput input::placeholder,
        .stTextInput input::-webkit-input-placeholder,
        .stTextArea textarea::-webkit-input-placeholder,
        .stNumberInput input::-webkit-input-placeholder {
            color: var(--muted) !important;
            -webkit-text-fill-color: var(--muted) !important;
            opacity: 1 !important;
        }

        .stTextInput [data-baseweb="input"]:focus-within,
        .stTextArea textarea:focus,
        .stNumberInput [data-baseweb="input"]:focus-within,
        .stSelectbox [data-baseweb="select"] > div:focus-within {
            border-color: var(--text) !important;
            outline: none !important;
            box-shadow: 0 0 0 2px rgba(207, 195, 251, 0.45) !important;
        }

        [data-baseweb="popover"],
        [data-baseweb="popover"] ul,
        ul[role="listbox"],
        div[role="listbox"] {
            background: var(--surface) !important;
            color: var(--text) !important;
            border: 1px solid var(--line) !important;
            border-radius: 10px !important;
        }

        [role="option"], [role="option"] *, li[role="option"], li[role="option"] * {
            background: var(--surface) !important;
            color: var(--text) !important;
            -webkit-text-fill-color: var(--text) !important;
        }

        [role="option"]:hover,
        [role="option"][aria-selected="true"] {
            background: var(--surface-soft) !important;
            color: var(--text) !important;
        }

        .stFileUploader section,
        [data-testid="stFileUploader"] section {
            background: var(--surface) !important;
            border: 1px dashed var(--line) !important;
            border-radius: 12px !important;
            color: var(--text) !important;
        }

        .stFileUploader section small,
        [data-testid="stFileUploader"] section small,
        .stFileUploader section span,
        [data-testid="stFileUploader"] section span {
            color: var(--muted) !important;
            -webkit-text-fill-color: var(--muted) !important;
        }

        .hero-card,
        .credit-hero {
            padding: 1.75rem 1.9rem;
            border-radius: 18px;
            background: var(--surface) !important;
            color: var(--text) !important;
            border: 1px solid var(--line);
            box-shadow: 0 8px 22px rgba(45, 36, 64, 0.08);
            margin-bottom: 1.35rem;
        }

        .hero-card h1,
        .credit-hero h2 {
            color: var(--text) !important;
            font-weight: 900;
            margin: 0 0 0.6rem 0;
        }

        .hero-card p,
        .credit-hero p {
            color: var(--muted) !important;
            line-height: 1.7;
            margin: 0;
        }

        .work-row {
            display: flex;
            gap: 22px;
            align-items: center;
            width: 100%;
        }

        .work-thumb-area {
            flex: 0 0 112px;
            width: 112px;
            display: flex;
            justify-content: center;
            align-items: center;
        }

        .work-content-area {
            flex: 1 1 auto;
            min-width: 0;
        }

        .work-info-grid {
            display: grid;
            grid-template-columns: minmax(0, 1fr) 136px 136px 168px;
            gap: 16px;
            align-items: center;
        }

        .work-action-stack {
            display: flex;
            flex-direction: column;
            gap: 10px;
        }

        .work-thumbnail,
        .work-thumbnail-placeholder {
            width: 76px;
            height: 102px;
            border-radius: 14px;
            object-fit: cover;
            display: block;
            border: 1px solid var(--line);
        }

        .work-thumbnail-detail,
        .work-thumbnail-detail-placeholder {
            width: 126px;
            height: 168px;
            border-radius: 16px;
            object-fit: cover;
            display: block;
            border: 1px solid var(--line);
        }

        .work-thumbnail-placeholder {
            background: linear-gradient(160deg, #FFF9F7 0%, #F3EEFF 100%);
            color: var(--text) !important;
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
        }

        .work-thumbnail-detail-placeholder {
            background: linear-gradient(160deg, #FFF9F7 0%, #F3EEFF 100%);
            color: var(--text) !important;
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
        }

        .default-cover {
            width: 100%;
            height: 100%;
            padding: 14px 10px;
            display: flex;
            flex-direction: column;
            justify-content: center;
            gap: 10px;
        }

        .default-cover-detail {
            width: 100%;
            height: 100%;
            padding: 26px 18px;
            display: flex;
            flex-direction: column;
            justify-content: center;
            gap: 16px;
        }

        .cover-star {
            text-align: right;
            color: #6E5BB8;
            font-size: 15px;
            line-height: 1;
        }

        .default-cover-detail .cover-star {
            font-size: 22px;
        }

        .cover-lines {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 7px;
        }

        .default-cover-detail .cover-lines {
            gap: 11px;
        }

        .cover-lines span {
            display: block;
            height: 3px;
            border-radius: 999px;
            background: #CFC3FB;
        }

        .default-cover-detail .cover-lines span {
            height: 4px;
        }

        .cover-lines span:nth-child(1) {
            width: 34px;
        }

        .cover-lines span:nth-child(2) {
            width: 48px;
            background: #A89BD4;
        }

        .cover-lines span:nth-child(3) {
            width: 28px;
            background: #E9E1FF;
        }

        .default-cover-detail .cover-lines span:nth-child(1) {
            width: 54px;
        }

        .default-cover-detail .cover-lines span:nth-child(2) {
            width: 76px;
        }

        .default-cover-detail .cover-lines span:nth-child(3) {
            width: 44px;
        }
        .pill,
        .guide-tag {
            display: inline-flex !important;
            align-items: center !important;
            gap: 0.25rem !important;
            padding: 0.32rem 0.62rem !important;
            border-radius: 999px !important;
            background: var(--surface-soft) !important;
            color: var(--text) !important;
            border: 1px solid var(--line);
            font-size: 0.76rem !important;
            font-weight: 800;
            line-height: 1.2 !important;
        }

        .compare-box,
        .translation-box,
        .review-summary-box,
        .chat-panel {
            border-radius: 18px !important;
            padding: 1rem !important;
            font-size: 0.92rem !important;
            line-height: 1.72 !important;
            color: var(--text) !important;
            background: var(--surface) !important;
            border: 1px solid var(--line) !important;
            box-shadow: 0 8px 22px rgba(45, 36, 64, 0.08) !important;
        }

        .compare-box,
        .translation-box {
            min-height: 320px !important;
            white-space: pre-wrap;
            overflow-y: auto;
        }

        .chat-bubble-user,
        .chat-bubble-ai {
            padding: 0.8rem 0.95rem;
            border-radius: 14px;
            background: var(--surface-soft) !important;
            color: var(--text) !important;
            border: 1px solid var(--line);
            line-height: 1.65;
            font-size: 0.9rem;
        }

        .chat-bubble-user {
            margin: 0.55rem 0 0.55rem 3.5rem;
        }

        .chat-bubble-ai {
            margin: 0.55rem 3.5rem 0.55rem 0;
        }

        .guide-report {
            max-width: 920px;
            margin: 0 auto;
        }

        .guide-cover {
            padding: 1.75rem 1.9rem !important;
            border-radius: 18px !important;
            position: relative;
            overflow: hidden;
        }

        .guide-cover::after {
            content: "";
        }

        .guide-section {
            margin: 30px 0;
        }

        .guide-section-header {
            display: flex;
            align-items: baseline;
            gap: 12px;
            padding-bottom: 10px;
            margin-bottom: 16px;
            border-bottom: 1px solid var(--line);
        }

        .guide-section-num {
            font-size: 26px;
            font-weight: 900;
            color: var(--muted) !important;
        }

        .guide-grid-2 {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
            margin-bottom: 12px;
        }

        .guide-grid-3 {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 12px;
            margin-bottom: 12px;
        }

        .guide-card {
            padding: 1rem 1.05rem !important;
            min-height: 142px;
        }

        .guide-list {
            padding-left: 0;
            list-style: none;
            margin: 0;
        }

        .guide-list li {
            margin-bottom: 0.55rem !important;
            line-height: 1.58 !important;
            font-size: 0.88rem !important;
            color: var(--text) !important;
        }

        .guide-do::before {
            content: "✓";
            color: var(--text);
            font-weight: 900;
            margin-right: 8px;
        }

        .guide-warn::before {
            content: "!";
            color: var(--text);
            font-weight: 900;
            margin-right: 8px;
        }

        .guide-dont::before {
            content: "✕";
            color: var(--text);
            font-weight: 900;
            margin-right: 8px;
        }

        .guide-alert {
            border-radius: 12px;
            padding: 0.85rem 1rem;
            font-size: 0.9rem;
            line-height: 1.6;
            margin-bottom: 12px;
            background: var(--surface-soft) !important;
            color: var(--text) !important;
            border-left: 4px solid var(--text) !important;
        }

        .guide-platform-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 0.82rem !important;
            background: var(--surface) !important;
            border-radius: 14px !important;
            overflow: hidden;
            border: 1px solid var(--line) !important;
            color: var(--text) !important;
        }

        .guide-platform-table th {
            background: var(--surface-soft) !important;
            padding: 0.72rem 0.78rem !important;
            text-align: left;
            color: var(--text) !important;
            font-weight: 800;
        }

        .guide-platform-table td {
            padding: 0.72rem 0.78rem !important;
            border-top: 1px solid var(--line) !important;
            vertical-align: top;
            line-height: 1.45;
            color: var(--text) !important;
        }

        .price-highlight {
            background: var(--surface-soft) !important;
            border: 1px solid var(--line) !important;
            border-radius: 18px !important;
        }

        [data-testid="stAlert"] {
            background: var(--surface-soft) !important;
            border-color: var(--line) !important;
            color: var(--text) !important;
            border-radius: 14px !important;
            padding: 0.85rem 1rem !important;
        }

        [data-testid="stDataFrame"],
        .stDataFrame {
            border-radius: 14px;
            overflow: hidden;
        }

        .danger-zone {
            background: var(--danger-bg) !important;
            border: 1px solid var(--danger-line) !important;
            border-radius: 18px !important;
            padding: 1rem;
        }


        .pay-button {
            display: flex !important;
            width: 100% !important;
            min-height: 44px !important;
            align-items: center !important;
            justify-content: center !important;
            margin-top: 0.8rem !important;
            margin-bottom: 0.8rem !important;
            box-sizing: border-box !important;
        }

        .price-highlight {
            padding: 0.95rem 1rem !important;
            margin-top: 18px !important;
            margin-bottom: 16px !important;
        }

        .price-highlight .label {
            margin-bottom: 0.35rem !important;
        }

        @media (max-width: 980px) {
            .work-row {
                flex-direction: column;
                align-items: flex-start;
            }

            .work-thumb-area {
                width: 100%;
                justify-content: flex-start;
            }

            .work-info-grid {
                grid-template-columns: 1fr;
                width: 100%;
            }

            .block-container {
                padding-left: 1rem !important;
                padding-right: 1rem !important;
            }

            [data-testid="stMetric"],
            .guide-card {
                min-height: auto !important;
            }

            .guide-grid-2,
            .guide-grid-3 {
                grid-template-columns: 1fr;
            }
        }
    </style>
    """,
    unsafe_allow_html=True,
)


TARGET_COUNTRIES = ["미국", "일본", "중국", "태국"]
GENRES = ["현대 로맨스", "현대 드라마", "현대 청춘", "현대 미스터리"]

SAMPLE_TEXT = ""

SENSITIVE_TEXT = ""

TRANSLATION_OUTPUTS = {
    "일본": {
        "translated": """すると、少女が水の中から何かを拾い上げた。白い小石だった。
少女はそれを手にしたまま、ぱっと立ち上がると、飛び跳ねるように飛び石を渡っていった。
向こう岸まで渡りきると、くるりとこちらを振り返って「ばーか」と言った。
白い小石がこちらへ飛んできた。""",
        "localized": """すると、少女が水の中から白い小石を拾い上げた。
次の瞬間、彼女はふわりと立ち上がり、飛び石を軽やかに渡っていった。
向こう岸に着くと、少し照れ隠しのように振り返り、「ばーか」と小さく言った。
白い小石が、こちらへ軽く飛んできた。""",
        "notes": [
            "일본 독자에게는 과장된 감정 표현보다 짧은 행동과 여백으로 설렘을 전달하는 편이 자연스럽습니다.",
            "“이 바보”는 직역보다 ‘ばーか’처럼 장난과 호감이 섞인 표현으로 처리했습니다.",
            "장면의 속도감은 유지하되, 일본어 문장 흐름에 맞춰 문장을 짧게 분리했습니다.",
        ],
    },
    "중국": {
        "translated": """少女从水里捡起了什么。那是一颗白色的小石子。
她突然站起身，蹦蹦跳跳地越过踏脚石。
到了对岸后，她猛地回过头来，说：“你这个笨蛋。”
白色的小石子朝这边飞了过来。""",
        "localized": """少女从水里捡起一颗白色的小石子。
她忽然站起来，轻快地跳过一块块踏脚石。
到了对岸，她回头望向这边，像是在掩饰害羞似的说：“笨蛋。”
那颗白色小石子轻轻地飞了过来。""",
        "notes": [
            "중국어권에서는 장면의 감정선을 명확히 전달하기 위해 ‘害羞’ 같은 감정 단서를 보완했습니다.",
            "직설적 모욕처럼 읽히지 않도록 ‘笨蛋’을 장난스러운 맥락으로 처리했습니다.",
            "정서 전달을 위해 행동 묘사를 부드럽게 재구성했습니다.",
        ],
    },
    "미국": {
        "translated": """Then the girl picked something out of the water. It was a white pebble.
She sprang to her feet and hopped across the stepping stones.
Once she reached the other side, she turned back sharply and said, “You dummy.”
The white pebble came flying toward him.""",
        "localized": """Then she reached into the water and picked up a smooth white pebble.
With a sudden burst of energy, she skipped across the stepping stones.
When she reached the far side, she turned back with a teasing smile. “You dork.”
The pebble sailed lightly through the air toward him.""",
        "notes": [
            "영미권에서는 ‘You dummy’보다 ‘You dork’가 더 장난스럽고 덜 공격적으로 읽힙니다.",
            "감정선을 명확하게 전달하기 위해 ‘teasing smile’을 보완했습니다.",
            "문장 리듬을 짧고 시각적으로 조정해 웹소설 독서 흐름에 맞췄습니다.",
        ],
    },
    "태국": {
        "translated": """แล้วเด็กหญิงก็หยิบอะไรบางอย่างขึ้นมาจากน้ำ มันคือก้อนกรวดสีขาว
เธอลุกพรวดขึ้นแล้วกระโดดข้ามหินไปทีละก้อน
เมื่อข้ามไปถึงอีกฝั่ง เธอก็หันกลับมาทันทีแล้วพูดว่า “คนบ้า”
ก้อนกรวดสีขาวลอยมาทางนี้""",
        "localized": """เด็กหญิงหยิบก้อนกรวดสีขาวขึ้นมาจากน้ำ
จากนั้นเธอก็ลุกขึ้นอย่างร่าเริง กระโดดข้ามหินไปทีละก้อน
พอถึงอีกฝั่ง เธอหันกลับมาเหมือนจะแกล้งหยอก แล้วพูดเบา ๆ ว่า “คนบ้า”
ก้อนกรวดสีขาวลอยมาหาเขาเบา ๆ""",
        "notes": [
            "태국어 표현에서는 장난스러운 분위기를 살리기 위해 ‘แกล้งหยอก’을 보완했습니다.",
            "감정 과잉보다 부드러운 정서 전달이 자연스럽도록 문장을 조정했습니다.",
            "독자에게 익숙한 웹소설 문장 호흡에 맞춰 줄 단위를 나눴습니다.",
        ],
    },
}

GUIDE_OUTPUTS = {
    ("일본", "현대 로맨스"): [
        "일본 모바일 웹소설 독자는 짧은 호흡의 문장과 섬세한 감정선을 선호하는 경향이 있습니다.",
        "현대 로맨스에서는 직접적인 감정 선언보다 시선, 침묵, 거리감, 짧은 대사를 통해 설렘을 전달하는 방식이 적합합니다.",
        "역사·정치 이슈는 작품의 핵심 주제가 아니라면 자극적으로 사용하지 않는 것이 좋습니다.",
        "1화 분량은 모바일 가독성을 고려해 지나치게 길지 않게 구성하고, 장면 전환을 명확히 분리하는 편이 좋습니다.",
    ],
    ("중국", "현대 드라마"): [
        "중국 플랫폼 진출 시 폭력성, 정치적 은유, 가족 윤리 훼손으로 해석될 수 있는 장면에 주의해야 합니다.",
        "캐릭터가 지나치게 비호감으로 읽히는 직접 폭력 장면은 감정 폭발이나 물건을 내려놓는 행동으로 완화할 수 있습니다.",
        "인물의 책임과 관계 회복 가능성을 함께 제시하면 캐릭터 호감도 하락을 줄일 수 있습니다.",
    ],
    ("태국", "현대 드라마"): [
        "태국 독자는 관계의 위계, 체면, 부드러운 대화 흐름에 민감할 수 있습니다.",
        "인력거 같은 문화 의존 명사는 현지 독자에게 익숙한 서민 교통수단으로 변환할 수 있습니다.",
        "직접적인 모욕보다 완곡한 표현과 상황 설명을 함께 제시하는 것이 자연스럽습니다.",
    ],
}

CREDIT_PLANS = {
    "Starter Credit": {"price": 1000, "credit": 5000, "desc": "짧은 회차 번역과 검수 체험용"},
    "Creator Credit": {"price": 2000, "credit": 10000, "desc": "기본 번역·검수 작업용 추천 플랜"},
    "Publisher Credit": {"price": 5000, "credit": 30000, "desc": "여러 회차 현지화 작업용 대용량 플랜"},
}


@st.cache_resource(show_spinner=False)
def get_locale_pipeline(
    locale: str,
    top_k: int = 3,
    translation_model: str = "gpt-5.4-mini",
    review_model: str = "gpt-5.4-mini",
):
    if not PIPELINE_AVAILABLE:
        return None

    mock = os.getenv("WLIGHTER_MOCK_MODE", "true").lower() in ("1", "true", "yes", "y")
    config = PipelineConfig(
        locale=locale,
        top_k=top_k,
        mock=mock,
        translation_model=os.getenv("WLIGHTER_TRANSLATION_MODEL", translation_model),
        review_model=os.getenv("WLIGHTER_REVIEW_MODEL", review_model),
    )
    return KoLocalePipeline(config)


def workflow_to_dict(result: Any) -> dict[str, Any]:
    try:
        return asdict(result)
    except Exception:
        if hasattr(result, "to_dict"):
            return result.to_dict()
        return dict(result)


def compact_references(result: dict[str, Any]) -> list[dict[str, Any]]:
    rows = []
    for index, row in enumerate(result.get("retrievals", []), start=1):
        item = row.get("item", {})
        rows.append(
            {
                "rank": index,
                "score": round(float(row.get("score", 0)), 4),
                "id": item.get("id", ""),
                "ko_anchor": ", ".join(item.get("ko_anchor_expression", []) or []),
                "target_expression": item.get("expression", ""),
                "meaning": item.get("meaning", ""),
                "strategy": item.get("translation_strategy", ""),
            }
        )
    return rows


def render_rag_summary(result: dict[str, Any], max_rows: int = 3) -> None:
    rows = compact_references(result)
    if not rows:
        st.info("RAG 근거가 없습니다. RAG용 파일을 정리해 두면 이 영역에 매칭 결과가 표시됩니다.")
        return

    for row in rows[:max_rows]:
        with st.container(border=True):
            cols = st.columns([0.55, 1.1, 1.1, 0.65])
            cols[0].metric("rank", row["rank"])
            cols[1].write(f"**한국어 앵커**  \n{row.get('ko_anchor') or '-'}")
            cols[2].write(f"**대상 표현**  \n{row.get('target_expression') or '-'}")
            cols[3].metric("score", f"{row.get('score', 0):.4f}")
            st.caption(f"의미: {row.get('meaning') or '-'}")
            st.caption(f"전략: {row.get('strategy') or '-'} · reference_id: {row.get('id') or '-'}")


def fallback_chat_reply(user_msg: str, target_country: str) -> tuple[str, str | None]:
    proposed = None
    if "왜" in user_msg and ("바보" in user_msg or "dork" in user_msg or "ばーか" in user_msg):
        answer = "‘이 바보’는 단순한 비난보다 장난과 호감이 섞인 표현으로 해석됩니다. 대상 국가 독자에게는 직역보다 장난스러운 호칭으로 조정하는 편이 자연스럽습니다."
    elif "부드럽" in user_msg or "자연스럽" in user_msg or "수정" in user_msg:
        if target_country == "일본":
            proposed = "すると、少女が水の中から白い小石を拾い上げた。\n彼女は軽やかに飛び石を渡ると、向こう岸で少し照れたように振り返った。\n「ばーか」と小さく言って、白い小石をこちらへそっと投げた。"
        elif target_country == "미국":
            proposed = "Then she picked up a smooth white pebble from the water.\nShe skipped lightly across the stepping stones, then turned back with a shy, teasing smile.\n“You dork,” she said, tossing the pebble gently toward him."
        else:
            proposed = None
        answer = "표현 강도를 낮추고 행동 묘사를 살리는 방향으로 수정하는 게 좋습니다. 수정안이 생성되면 아래에서 반영할 수 있습니다."
    elif "어색" in user_msg or "이상" in user_msg:
        answer = "어색하게 느껴지는 지점이 표현, 감정선, 고유명사 변환, 문장 호흡 중 어느 쪽인지 알려주시면 더 정확히 수정할 수 있습니다."
    else:
        answer = "현재 회차와 번역 결과를 기준으로 표현 강도와 대상 국가 독자 정서를 함께 고려해 답변할 수 있습니다. 수정할 문장이나 궁금한 표현을 지정해 주세요."
    return answer, proposed


RAG_DIR = Path(__file__).resolve().parent / "data" / "rag"

COUNTRY_TO_LANGUAGE_LABEL = {
    "일본": "일본어",
    "중국": "중국어 간체",
    "미국": "미국 영어",
    "태국": "태국어",
}

COUNTRY_TO_RAG_PREFIX = {
    "일본": "jp_idiom_references_enriched",
    "태국": "th_idiom_references_enriched",
    "미국": "us_idiom_references_enriched",
    "중국": "zh_idiom_references_enriched",
}

RAG_EXTENSIONS = [".txt", ".md", ".json"]


CULTURAL_PROMPT_FILES = {
    "미국": "CULTURAL_CONSTRAINTS_US.md",
    "일본": "CULTURAL_CONSTRAINTS_JP.md",
    "중국": "CULTURAL_CONSTRAINTS_CN.md",
    "태국": "CULTURAL_CONSTRAINTS_TH.md",
}


def load_prompt_file(filename: str) -> str:
    path = Path(__file__).resolve().parent / "prompts" / filename
    if not path.exists():
        return ""
    return path.read_text(encoding="utf-8")


def load_cultural_review_prompt(target_country: str) -> str:
    base_prompt = load_prompt_file("BASE_REVIEW_PROMPT.md")
    country_file = CULTURAL_PROMPT_FILES.get(target_country)
    country_prompt = load_prompt_file(country_file) if country_file else ""

    return f"""
{base_prompt}

{country_prompt}
""".strip()


def get_country_rag_files(target_country: str) -> list[Path]:
    """대상 국가에 맞는 RAG 파일만 찾는다."""
    RAG_DIR.mkdir(parents=True, exist_ok=True)

    prefix = COUNTRY_TO_RAG_PREFIX.get(target_country)
    if not prefix:
        return []

    matched_files = []

    for ext in RAG_EXTENSIONS:
        exact_path = RAG_DIR / f"{prefix}{ext}"
        if exact_path.exists():
            matched_files.append(exact_path)


    for path in sorted(RAG_DIR.glob(f"{prefix}*")):
        if path.suffix.lower() in RAG_EXTENSIONS and path not in matched_files:
            matched_files.append(path)

    return matched_files


def read_text_file_safely(path: Path) -> str:
    try:
        return path.read_text(encoding="utf-8")
    except UnicodeDecodeError:
        return path.read_text(encoding="cp949", errors="ignore")
    except Exception:
        return ""


def load_rag_context(target_country: str, max_chars: int = 7000) -> str:
    """대상 국가에 맞는 RAG 파일을 읽어 프롬프트 참고자료로 사용."""
    files = get_country_rag_files(target_country)

    chunks = []
    for path in files:
        text = read_text_file_safely(path)
        if text.strip():
            chunks.append(f"[파일: {path.name}]\n{text.strip()}")

    joined = "\n\n---\n\n".join(chunks)
    return joined[:max_chars]


def get_rag_status_text(target_country: str) -> str:
    files = get_country_rag_files(target_country)
    if not files:
        prefix = COUNTRY_TO_RAG_PREFIX.get(target_country, "unknown")
        return f"대상 국가 RAG 파일 없음: data/rag/{prefix}.txt 또는 .md 또는 .json"

    return "사용 RAG 파일: " + ", ".join([f.name for f in files])


def get_openai_client() -> OpenAI:
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise RuntimeError(".env 파일에 OPENAI_API_KEY를 설정해 주세요.")
    return OpenAI(api_key=api_key)


def call_llm_translation_and_review(source_text: str, target_country: str) -> dict:
    """원문을 대상 국가 기준으로 번역하고 검수 요약을 생성."""
    target_language = COUNTRY_TO_LANGUAGE_LABEL.get(target_country, target_country)
    rag_context = load_rag_context(target_country)

    system_prompt = f"""
너는 웹소설 현지화 번역가이자 문화권 검수자다.
한국어 웹소설 원문을 {target_country} 독자에게 자연스럽게 읽히도록 {target_language}로 번역한다.

반드시 JSON만 반환한다.
반환 JSON 스키마:
{{
  "final_translation": "최종 번역문",
  "review_summary": "검수 요약. 아래 항목을 포함해 한국어로 자세히 작성: 1) 번역 방향, 2) 문화권 표현 조정, 3) 위험/주의 표현, 4) 고유명사·시대 배경 처리, 5) 최종 권장사항"
}}

규칙:
- 원문의 장면과 감정선을 유지한다.
- 직역투를 피하고 대상 국가 독자에게 자연스럽게 조정한다.
- 문장과 문장을 과도하게 붙이지 말고 자연스럽게 띄어쓰기와 줄바꿈을 적용한다.
- 원문에 문단 구분이 있으면 번역문도 문단 구분을 최대한 유지한다.
- 한국어로 작성하는 review_summary는 반드시 5~7개의 항목으로 나누어 작성한다.
- review_summary는 각 항목을 줄바꿈으로 구분하고, 항목 사이가 붙어 보이지 않게 작성한다.
- review_summary 형식 예시:
  1. 번역 방향: ...
  2. 문화권 표현 조정: ...
  3. 위험/주의 표현: ...
  4. 시대 배경 처리: ...
  5. 최종 권장사항: ...
- review_summary는 너무 짧게 쓰지 말고, 발표 화면에서 설명 자료로 사용할 수 있을 정도로 구체적으로 작성한다.
- 일본어/중국어처럼 단어 사이 공백을 일반적으로 쓰지 않는 언어는 자연스러운 현지 표기 방식을 따른다.
- 영어/태국어처럼 단어 사이 공백을 쓰는 언어는 단어 간 띄어쓰기를 반드시 자연스럽게 유지한다.
- RAG 참고자료가 있으면 참고하되, 자료에 없는 내용을 사실처럼 단정하지 않는다.
- 검수 요약은 발표용으로 이해하기 쉽게 작성한다.
- JSON 문자열 안에는 필요한 줄바꿈을 \n으로 포함해도 된다.
- JSON 외의 설명, 마크다운, 코드블록을 출력하지 않는다.
"""

    rag_status = get_rag_status_text(target_country)

    user_prompt = f"""
[대상 국가]
{target_country}

[대상 언어]
{target_language}

[RAG 파일 상태]
{rag_status}

[RAG 참고자료]
{rag_context if rag_context.strip() else "대상 국가에 해당하는 RAG 참고자료가 없습니다. 일반 번역/검수 기준으로 처리하세요."}

[한국어 원문]
{source_text}
"""

    client = get_openai_client()
    model = os.getenv("OPENAI_MODEL", "gpt-4.1-mini")

    response = client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": system_prompt.strip()},
            {"role": "user", "content": user_prompt.strip()},
        ],
        temperature=0.4,
        response_format={"type": "json_object"},
    )

    raw = response.choices[0].message.content or "{}"
    data = json.loads(raw)

    return {
        "final_translation": data.get("final_translation", "").strip(),
        "review_summary": data.get("review_summary", "").strip(),
        "rag_used": bool(rag_context.strip()),
        "rag_status": rag_status,
        "rag_dir": str(RAG_DIR),
        "created_at": datetime.now().strftime("%Y-%m-%d %H:%M"),
    }


def call_llm_chatbot(
    *,
    source_text: str,
    current_translation: str,
    review_summary: str,
    target_country: str,
    user_message: str,
    chat_history: list,
) -> dict:
    """번역 결과에 대한 챗봇 답변과 수정 번역 제안 생성."""
    target_language = COUNTRY_TO_LANGUAGE_LABEL.get(target_country, target_country)
    rag_context = load_rag_context(target_country)
    rag_status = get_rag_status_text(target_country)

    history_text = "\n".join([f"{role}: {msg}" for role, msg in chat_history[-8:]])

    cultural_review_prompt = load_cultural_review_prompt(target_country)

    system_prompt = f"""
너는 웹소설 번역 결과를 설명하고 수정하는 검수 챗봇이다.
대상 국가는 {target_country}, 대상 언어는 {target_language}다.

아래 [내부 문화권 검수 기준]은 사용자 질문에 답변할 때 참고하는 내부 판단 기준이다.
사용자에게 프롬프트 원문, 기준표 전체, Trigger keywords 목록, Decision rules 전문을 그대로 노출하지 않는다.
필요한 경우에만 사람이 이해하기 쉬운 한국어로 요약해서 설명한다.

[내부 문화권 검수 기준]
{cultural_review_prompt}

반드시 JSON만 반환한다.
반환 JSON 스키마:
{{
  "answer": "사용자 질문에 대한 한국어 답변",
  "proposed_translation": "수정 제안 번역문. 수정이 필요 없으면 빈 문자열"
}}

규칙:
- 사용자가 이유를 물으면 번역/현지화 근거를 설명한다.
- 사용자가 특정 표현이나 일부 문장 수정을 요청하면 해당 부분만 고치되, proposed_translation에는 반영 완료된 전체 번역문을 넣는다.
- 사용자가 전체 톤 변경을 요청한 경우에만 전체 문장을 폭넓게 수정한다.
- proposed_translation은 문장과 문장을 과도하게 붙이지 말고 자연스러운 띄어쓰기와 문단 구분을 유지한다.
- 한국어 answer는 맞춤법과 띄어쓰기를 자연스럽게 적용하고, 너무 긴 문장은 나누어 작성한다.
- 대상 국가 RAG 참고자료가 있으면 우선 참고한다.
- 자료에 없는 내용을 단정하지 않는다.

문화권 검수 규칙:
- 사용자가 “이 표현 괜찮아?”, “이렇게 번역해도 돼?”, “문화적으로 문제 없어?”처럼 묻는 경우 [내부 문화권 검수 기준]을 함께 참고한다.
- 원문, 현재 번역문, 사용자 요청 안에 문화권 리스크가 있으면 BLOCK, FLAG, ADAPT, NOTE 중 하나의 성격으로 판단한다.
- 단, 답변에는 기준표 원문을 복사하지 말고 “미국 독자 기준에서는 장애 비하 표현으로 읽힐 수 있습니다”처럼 자연스럽게 설명한다.
- 감지 ID는 꼭 필요한 경우에만 짧게 언급한다. 예: “US08 장애 비하 표현 항목에 가까워 보입니다.”
- 위험 표현이 있으면 왜 문제가 되는지, 어떤 방향으로 완화하면 좋은지, 가능한 대체 표현을 제안한다.
- 위험 표현이 없으면 억지로 경고를 만들지 말고 “현재 문맥에서는 큰 문화권 리스크는 낮아 보입니다”처럼 답한다.
- 문화권 검수 기준과 RAG 참고자료가 충돌하면 문화권 안전성과 현지 독자 수용성을 우선한다.

출력 규칙:
- JSON 문자열 안에는 필요한 줄바꿈을 \\n으로 포함해도 된다.
- JSON 외의 설명, 마크다운, 코드블록을 출력하지 않는다.
"""

    user_prompt = f"""
[RAG 파일 상태]
{rag_status}

[RAG 참고자료]
{rag_context if rag_context.strip() else "대상 국가에 해당하는 RAG 참고자료가 없습니다."}

[한국어 원문]
{source_text}

[현재 최종 번역]
{current_translation}

[검수 요약]
{review_summary}

[이전 대화]
{history_text if history_text.strip() else "없음"}

[사용자 요청]
{user_message}
"""

    client = get_openai_client()
    model = os.getenv("OPENAI_MODEL", "gpt-4.1-mini")

    response = client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": system_prompt.strip()},
            {"role": "user", "content": user_prompt.strip()},
        ],
        temperature=0.5,
        response_format={"type": "json_object"},
    )

    raw = response.choices[0].message.content or "{}"
    data = json.loads(raw)

    return {
        "answer": data.get("answer", "").strip(),
        "proposed_translation": data.get("proposed_translation", "").strip(),
    }


OPENAI_IMAGE_MODEL = os.getenv("OPENAI_IMAGE_MODEL", "gpt-image-2")

DUMMY_CHARACTER_PROFILES = {
    "김첨지": {
        "name": "김첨지",
        "personality": "거칠고 무뚝뚝하지만 가족을 부양하려는 책임감이 강한 인물",
        "job": "근대 도시의 인력거꾼",
        "appearance_features": "낡은 저고리와 바지, 비에 젖은 옷자락, 지친 표정, 거친 생활감, 인력거 옆에 서 있는 모습",
    },
    "마누라": {
        "name": "마누라",
        "personality": "병약하지만 가족을 걱정하는 마음이 깊고 조용히 감정을 견디는 인물",
        "job": "가난한 도시 하층민 가정의 아내",
        "appearance_features": "수수한 한복 차림, 창백하고 지친 얼굴, 어두운 방 안에서 가족을 기다리는 모습",
    },
    "개똥이": {
        "name": "개똥이",
        "personality": "순수하고 가족에게 의지하는 어린아이",
        "job": "김첨지와 마누라의 어린 아들",
        "appearance_features": "소박하고 단정한 옷차림, 순수하고 걱정스러운 표정, 부모를 기다리는 아이의 모습",
    },
}

DUMMY_RELATION_MAP = {
    "work_title": "운수 좋은 날",
    "characters": [
        {"name": "김첨지", "description": "가난한 인력거꾼이자 가족을 부양하는 성인 남성"},
        {"name": "마누라", "description": "김첨지의 아내이자 병약한 가족 구성원"},
        {"name": "개똥이", "description": "김첨지와 마누라의 어린 아들"},
    ],
    "relations": [
        {"from": "김첨지", "to": "마누라", "relation": "부부 / 책임 / 비극"},
        {"from": "김첨지", "to": "개똥이", "relation": "부자 / 부양 / 걱정"},
        {"from": "마누라", "to": "개똥이", "relation": "모자 / 보호 / 애정"},
    ],
    "theme": "가난, 가족, 비극적 아이러니, 근대 도시의 현실",
}


def generate_openai_image(prompt: str, size: str = "1024x1024") -> dict:
    """OpenAI Images API로 이미지를 생성하고 표시 가능한 데이터를 반환."""
    client = get_openai_client()

    response = client.images.generate(
        model=OPENAI_IMAGE_MODEL,
        prompt=prompt,
        size=size,
        n=1,
    )

    item = response.data[0]


    b64_json = getattr(item, "b64_json", None)
    image_url = getattr(item, "url", None)

    if b64_json:
        return {
            "type": "base64",
            "data": b64_json,
            "model": OPENAI_IMAGE_MODEL,
            "created_at": datetime.now().strftime("%Y-%m-%d %H:%M"),
        }

    if image_url:
        return {
            "type": "url",
            "data": image_url,
            "model": OPENAI_IMAGE_MODEL,
            "created_at": datetime.now().strftime("%Y-%m-%d %H:%M"),
        }

    raise RuntimeError("이미지 생성 결과에서 이미지 데이터를 찾지 못했습니다.")


def render_generated_image(image_result: dict, caption: str = ""):
    if not image_result:
        st.info("아직 생성된 이미지가 없습니다.")
        return

    if image_result.get("type") == "base64":
        st.image(base64.b64decode(image_result["data"]), use_container_width=True)
    elif image_result.get("type") == "url":
        st.image(image_result["data"], use_container_width=True)
    else:
        st.warning("지원하지 않는 이미지 결과 형식입니다.")

    if caption:
        st.caption(caption)


def build_character_image_prompt(
    work_title: str,
    character_name: str,
    personality: str,
    job: str,
    appearance_features: str,
    extra_prompt: str,
) -> str:
    return f"""
Create a polished web novel character illustration.

Work title: {work_title}
Character name: {character_name}
Personality: {personality}
Occupation or role: {job}
Appearance features: {appearance_features}

Additional user request:
{extra_prompt if extra_prompt.strip() else "No additional request."}

Scene direction:
A Korean modern literary atmosphere inspired by a rainy early-modern city street or a modest poor household.
The image should feel like a serious web novel character concept illustration.

Safety and style requirements:
- family-friendly, non-sexual, safe-for-all-ages composition
- if the character is a child, depict a modestly clothed child in a safe family/literary context
- high quality digital illustration
- Korean modern literary atmosphere
- soft cinematic lighting
- expressive but not exaggerated
- no text, no watermark, no logo
- single character centered composition
""".strip()


def build_relation_map_prompt(work_title: str, relation_data: dict, extra_prompt: str) -> str:
    characters_text = "\n".join(
        [f"- {c['name']}: {c['description']}" for c in relation_data["characters"]]
    )
    relations_text = "\n".join(
        [f"- {r['from']} → {r['to']}: {r['relation']}" for r in relation_data["relations"]]
    )

    return f"""
Create a clean visual character relationship map for a web novel.

Work title: {work_title}
Characters:
{characters_text}

Relationships:
{relations_text}

Main theme:
{relation_data['theme']}

Additional user request:
{extra_prompt if extra_prompt.strip() else "No additional request."}

Safety and style requirements:
- family-friendly, non-sexual, safe-for-all-ages relationship diagram
- if a child appears, depict the child modestly and safely in a family relationship context
- clean diagram-like composition
- three character portrait nodes connected by relationship arrows
- muted modern literary color palette
- readable layout
- minimal Korean labels only if text is necessary
- no watermark, no logo
""".strip()


LOCALIZATION_BASE_DIR = Path(__file__).resolve().parent / "data"
LOCALIZATION_GUIDE_DIR = LOCALIZATION_BASE_DIR / "localization_guide"
LOCALIZATION_DATA_ROOT = LOCALIZATION_GUIDE_DIR / "raw"


LOCALIZATION_LEGACY_ROOT = LOCALIZATION_BASE_DIR
LOCALIZATION_OLD_ROOT = LOCALIZATION_GUIDE_DIR

COUNTRY_TO_GUIDE_FILES = {
    "미국": [
        "local_data/culture_report/usa_culture_report.md",
        "local_data/usa_tapas_content_guidelines.md",
        "local_data/usa_wattpad_genre.md",
        "local_data/usa_wattpad_rules.md",
        "local_data/usa_webnovel_guidelines.md",
        "tavily_localization_report_US_smoke.md",
        "us_webnovel_localization_guide_goal.html",
        "localization_reports/us_romance_gpt41mini_smoke.json",
        "localization_reports/us_romance_gpt41mini_smoke.html",
    ],
    "일본": [
        "local_data/culture_report/jp_culture_report.md",
    ],
    "중국": [
        "local_data/culture_report/ch_culture_report.md",
    ],
    "태국": [
        "local_data/culture_report/th_culture_report.md",
        "localization_reports/thailand_현대로맨스_localization_report.html",
    ],
}


def strip_html_tags(text: str) -> str:
    import re as _re
    text = _re.sub(r"<script[\s\S]*?</script>", " ", text, flags=_re.IGNORECASE)
    text = _re.sub(r"<style[\s\S]*?</style>", " ", text, flags=_re.IGNORECASE)
    text = _re.sub(r"<[^>]+>", " ", text)
    text = unescape(text)
    text = _re.sub(r"\n\s*\n\s*\n+", "\n\n", text)
    text = _re.sub(r"[ \t]+", " ", text)
    return text.strip()


def read_guide_source(path: Path) -> str:
    try:
        raw = path.read_text(encoding="utf-8")
    except UnicodeDecodeError:
        raw = path.read_text(encoding="cp949", errors="ignore")
    except Exception:
        return ""

    if path.suffix.lower() == ".html":
        return strip_html_tags(raw)

    if path.suffix.lower() == ".json":
        try:
            data = json.loads(raw)
            return json.dumps(data, ensure_ascii=False, indent=2)
        except Exception:
            return raw

    return raw


def resolve_localization_path(rel_path: str) -> Path | None:
    """data/localization_guide/raw 우선, 이전 폴더 구조는 fallback으로만 찾는다."""
    candidates = [
        LOCALIZATION_DATA_ROOT / rel_path,
        LOCALIZATION_OLD_ROOT / rel_path,
        LOCALIZATION_LEGACY_ROOT / rel_path,
    ]


    candidates.extend([
        LOCALIZATION_DATA_ROOT / "localization_guide" / rel_path,
        LOCALIZATION_DATA_ROOT / "raw" / rel_path,
        LOCALIZATION_OLD_ROOT / "data" / rel_path,
    ])

    for path in candidates:
        if path.exists():
            return path

    return None

def load_localization_guide_context(target_country: str, max_chars: int = 13000) -> tuple[str, list[str]]:
    """국가별 현지화 가이드 자료를 읽어 프롬프트 컨텍스트로 구성."""
    rel_paths = COUNTRY_TO_GUIDE_FILES.get(target_country, [])
    chunks = []
    used_files = []

    for rel in rel_paths:
        path = resolve_localization_path(rel)
        if path is None:
            continue

        text = read_guide_source(path)
        if not text.strip():
            continue

        try:
            display_path = str(path.relative_to(LOCALIZATION_BASE_DIR))
        except ValueError:
            display_path = path.name

        used_files.append(display_path)
        chunks.append(f"[자료: {display_path}]\n{text.strip()}")

    joined = "\n\n---\n\n".join(chunks)
    return joined[:max_chars], used_files


def html_escape(value) -> str:
    import html
    return html.escape(str(value if value is not None else ""))


def looks_like_html_table(value) -> bool:
    """LLM이 표 HTML을 문자열로 반환했는지 판별한다."""
    text = unescape(str(value if value is not None else ""))
    return bool(re.search(r"<\s*/?\s*(table|tbody|thead|tr|td|th)\b", text, flags=re.IGNORECASE))


def clean_guide_text(value) -> str:
    """LLM이 HTML/마크업을 섞어 반환해도 화면에는 일반 문장만 출력한다."""
    if value is None:
        return ""

    if isinstance(value, (dict, list)):
        value = json.dumps(value, ensure_ascii=False)

    text = unescape(str(value))
    text = text.replace("\\n", "\n")
    text = re.sub(r"```(?:html|json|markdown|md)?", " ", text, flags=re.IGNORECASE)


    if looks_like_html_table(text):
        return ""

    text = re.sub(r"<script[\s\S]*?</script>", " ", text, flags=re.IGNORECASE)
    text = re.sub(r"<style[\s\S]*?</style>", " ", text, flags=re.IGNORECASE)
    text = re.sub(r"</?(div|ul|li|span|p|br|strong|em|b|i)[^>]*>", " ", text, flags=re.IGNORECASE)
    text = re.sub(r"<[^>]+>", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def split_guide_string(text: str) -> list[str]:
    text = unescape(str(text or ""))
    if looks_like_html_table(text):
        return []
    text = re.sub(r"```(?:html|json|markdown|md)?", " ", text, flags=re.IGNORECASE)
    parts = re.split(r"\n+|[•·]|(?:^|\s)(?:\d+\.|-\s+)", text)
    return [clean_guide_text(x) for x in parts if clean_guide_text(x)]


def clean_guide_items(items) -> list[str]:
    """리스트가 아닌 값이 들어와도 안전하게 카드용 리스트로 변환."""
    if not items:
        return []

    if isinstance(items, str):
        return split_guide_string(items)

    if isinstance(items, dict):
        cleaned = []
        for k, v in items.items():
            if looks_like_html_table(v):
                continue
            text = clean_guide_text(f"{k}: {v}")
            if text:
                cleaned.append(text)
        return cleaned

    cleaned = []
    for item in items:
        if looks_like_html_table(item):
            continue
        text = clean_guide_text(item)
        if text:
            cleaned.append(text)

    return cleaned


def parse_platform_rows_from_html(value) -> list[dict[str, str]]:
    """platforms가 HTML 표 문자열로 들어와도 표 데이터로 복구한다."""
    text = unescape(str(value if value is not None else ""))
    if not looks_like_html_table(text):
        return []

    rows = []
    for tr in re.findall(r"<tr[^>]*>([\s\S]*?)</tr>", text, flags=re.IGNORECASE):
        cells = re.findall(r"<t[dh][^>]*>([\s\S]*?)</t[dh]>", tr, flags=re.IGNORECASE)
        cells = [clean_guide_text(c) for c in cells]
        cells = [c for c in cells if c]
        if len(cells) >= 2 and cells[0] not in ("플랫폼", "Platform"):
            rows.append({
                "name": cells[0] if len(cells) > 0 else "-",
                "audience": cells[1] if len(cells) > 1 else "-",
                "rating": cells[2] if len(cells) > 2 else "-",
                "monetization": cells[3] if len(cells) > 3 else "-",
                "notes": cells[4] if len(cells) > 4 else "-",
            })
    return rows


def render_guide_list(items, class_name: str = "guide-do") -> str:
    cleaned_items = clean_guide_items(items)
    if not cleaned_items:
        return "<li>생성된 항목이 없습니다.</li>"
    return "".join([f"<li class='{class_name}'>{html_escape(item)}</li>" for item in cleaned_items])


def fully_unescape(value) -> str:
    """HTML 엔티티가 두세 번 섞여 들어온 경우까지 풀어준다."""
    text = str(value if value is not None else "")
    for _ in range(4):
        new_text = unescape(text)
        if new_text == text:
            break
        text = new_text
    return text


def contains_html_markup(value) -> bool:
    """표/카드/리스트 HTML 조각이 화면에 코드처럼 노출되는 것을 방지한다."""
    text = fully_unescape(value).lower()
    return bool(re.search(r"</?\s*(table|tbody|thead|tr|td|th|div|ul|li|code|pre)\b", text))


def flatten_text_items(value) -> list[str]:
    """어떤 형태가 들어와도 가이드 카드에 넣을 안전한 문자열 목록으로 변환한다."""
    if value is None:
        return []

    if isinstance(value, list):
        result = []
        for item in value:
            result.extend(flatten_text_items(item))
        return result

    if isinstance(value, dict):
        result = []
        for k, v in value.items():
            if contains_html_markup(k) or contains_html_markup(v):
                continue
            text = clean_guide_text(f"{k}: {v}")
            if text:
                result.append(text)
        return result

    text = fully_unescape(value).replace("\\n", "\n")
    if contains_html_markup(text):
        return []

    parts = re.split(r"\n+|[•·]|(?:^|\s)(?:\d+\.|-\s+)", text)
    cleaned = []
    for part in parts:
        item = clean_guide_text(part)
        if item and not contains_html_markup(item):
            cleaned.append(item)
    return cleaned


def render_safe_guide_list(items, class_name: str = "guide-do") -> str:
    cleaned_items = flatten_text_items(items)
    if not cleaned_items:
        return "<li>생성된 항목이 없습니다.</li>"
    return "".join([f"<li class='{class_name}'>{html_escape(item)}</li>" for item in cleaned_items[:8]])


def extract_platforms_from_any(value) -> list[dict[str, str]]:
    """LLM이 platforms를 배열/문자열/HTML 조각으로 줘도 표에 넣을 행만 복구한다."""
    rows: list[dict[str, str]] = []

    def add_row(obj):
        if not isinstance(obj, dict):
            return
        row = {}
        for key in ["name", "audience", "rating", "monetization", "notes"]:
            cell = clean_guide_text(obj.get(key, "-"))
            if contains_html_markup(cell):
                cell = "-"
            row[key] = cell or "-"
        if row.get("name") and row.get("name") != "-":
            rows.append(row)

    if isinstance(value, list):
        for item in value:
            if isinstance(item, dict):
                add_row(item)
            else:
                rows.extend(extract_platforms_from_any(item))
        return rows

    if isinstance(value, dict):
        add_row(value)
        return rows

    text = fully_unescape(value)

    for tr in re.findall(r"<tr[^>]*>([\s\S]*?)</tr>", text, flags=re.IGNORECASE):
        cells = re.findall(r"<t[dh][^>]*>([\s\S]*?)</t[dh]>", tr, flags=re.IGNORECASE)
        cells = [clean_guide_text(c) for c in cells]
        cells = [c for c in cells if c and not contains_html_markup(c)]
        if len(cells) >= 2 and cells[0].lower() not in ("플랫폼", "platform"):
            rows.append({
                "name": cells[0] if len(cells) > 0 else "-",
                "audience": cells[1] if len(cells) > 1 else "-",
                "rating": cells[2] if len(cells) > 2 else "-",
                "monetization": cells[3] if len(cells) > 3 else "-",
                "notes": cells[4] if len(cells) > 4 else "-",
            })
    return rows


def fallback_platform_rows(target_country: str) -> list[dict[str, str]]:
    """플랫폼 정보가 깨져 들어왔을 때 발표 화면이 무너지지 않도록 기본 행을 제공한다."""
    if target_country == "미국":
        return [
            {"name": "Wattpad", "audience": "청소년·젊은 성인", "rating": "13+ 권장", "monetization": "광고·유료 구독", "notes": "혐오, 성적 착취, 저작권 침해 주의"},
            {"name": "Tapas", "audience": "20대~30대", "rating": "성인 콘텐츠 제한", "monetization": "코인·유료 에피소드", "notes": "로맨스·드라마 장르 적합"},
            {"name": "Webnovel", "audience": "장르 소설 독자", "rating": "성인물 제한", "monetization": "유료 연재 가능", "notes": "폭력·성적 묘사 정책 확인 필요"},
        ]
    if target_country == "일본":
        return [
            {"name": "Kakuyomu", "audience": "라이트노벨·웹소설 독자", "rating": "전연령~성인 구분", "monetization": "콘테스트·수익화", "notes": "짧은 호흡과 태그 설계 중요"},
            {"name": "Shōsetsuka ni Narō", "audience": "웹소설 독자", "rating": "플랫폼 기준 확인", "monetization": "외부 출판 연계", "notes": "직접적 성인 묘사 주의"},
        ]
    if target_country == "중국":
        return [
            {"name": "Qidian", "audience": "장르 웹소설 독자", "rating": "검열 기준 확인", "monetization": "유료 연재", "notes": "정치·폭력·선정성 표현 주의"},
            {"name": "Jinjiang", "audience": "로맨스·드라마 독자", "rating": "플랫폼 심사", "monetization": "유료 회차", "notes": "관계 윤리와 수위 조절 중요"},
        ]
    return [
        {"name": "ReadAWrite", "audience": "태국 웹소설 독자", "rating": "플랫폼 등급 기준", "monetization": "유료 회차 가능", "notes": "존칭·관계 위계 표현 중요"},
        {"name": "Dek-D", "audience": "청소년·젊은 독자", "rating": "청소년 보호 기준", "monetization": "작품별 상이", "notes": "직설적 모욕과 선정성 주의"},
    ]


def fallback_common_bans(target_country: str) -> list[str]:
    """LLM 결과에 HTML 조각이 섞였을 때 대신 보여줄 안전한 공통 주의 항목."""
    if target_country == "미국":
        return [
            "아동·청소년 대상 성적 묘사는 금지 또는 강한 제한 대상으로 본다.",
            "혐오 표현, 차별 표현, 괴롭힘을 미화하지 않는다.",
            "타인의 저작권을 침해하는 문장, 설정, 이미지 사용을 피한다.",
        ]
    if target_country == "일본":
        return [
            "연령 등급이 필요한 소재는 플랫폼 기준에 맞춰 분리한다.",
            "실존 인물·단체를 직접 비방하는 표현은 피한다.",
            "선정적 묘사와 폭력 묘사는 맥락과 수위를 함께 점검한다.",
        ]
    if target_country == "중국":
        return [
            "정치적 은유, 검열 민감 소재, 과도한 폭력 묘사를 주의한다.",
            "가족 윤리와 사회 질서를 훼손하는 방향으로 읽히지 않게 조정한다.",
            "플랫폼 심사 기준에 맞춰 선정성과 잔혹성을 낮춘다.",
        ]
    return [
        "왕실·종교·사회적 위계와 관련된 표현은 조심스럽게 다룬다.",
        "직설적인 모욕과 차별 표현은 완곡하게 조정한다.",
        "청소년 독자층이 많은 플랫폼에서는 선정성과 폭력 수위를 낮춘다.",
    ]


def safe_alert(value, fallback: str) -> str:
    text = clean_guide_text(value)
    if not text or contains_html_markup(text):
        return fallback
    return text


def safe_common_bans(value, target_country: str) -> list[str]:
    items = flatten_text_items(value)
    items = [item for item in items if item and not contains_html_markup(item)]
    if not items:
        return fallback_common_bans(target_country)
    return items[:5]


def fixed_platform_rules_for_demo(target_country: str, genre: str) -> tuple[str, list[dict[str, str]], list[str]]:
    """플랫폼 규정 영역은 LLM/캐시 결과를 쓰지 않고 고정 데이터로 렌더링한다.

    이유:
    - LLM이나 기존 smoke HTML 데이터가 <tr>, <td>, <div> 조각을 문자열로 반환하면
      Streamlit 화면에 HTML 코드가 그대로 노출될 수 있다.
    - 발표용 화면에서는 이 섹션이 무너지면 안 되므로, 플랫폼 규정은 하드코딩된 표로 고정한다.
    - 나머지 작성 방향/문화 주의사항/현지화 팁은 기존처럼 LLM 결과를 사용한다.
    """
    modern_note = "현대 로맨스·현대 드라마·현대 청춘·현대 미스터리 계열 기준"

    if target_country == "미국":
        alert = (
            "Tapas, Wattpad, Webnovel 등 주요 플랫폼은 혐오 표현, 아동 성적 묘사, "
            "스팸, 저작권 침해를 엄격히 제한하므로 업로드 전 커뮤니티 가이드라인 확인이 필요합니다."
        )
        rows = [
            {
                "name": "Wattpad",
                "audience": "10대~20대 중심, 청춘·로맨스 독자층",
                "rating": "13세 이상 권장",
                "monetization": "광고, 유료 구독, 크리에이터 프로그램",
                "notes": "커뮤니티 가이드라인, 혐오·괴롭힘·저작권 침해 주의",
            },
            {
                "name": "Tapas",
                "audience": "20대~30대, 로맨스·드라마 독자층",
                "rating": "앱 내 성인 콘텐츠 제한",
                "monetization": "코인, 유료 에피소드, 후원형 수익화",
                "notes": "누드·성적 행위 이미지, 미성년자 성적 묘사, 그래픽 폭력 제한",
            },
            {
                "name": "Webnovel",
                "audience": "장르 웹소설 독자, 모바일 연재 독자",
                "rating": "성인 콘텐츠 등급 관리 필요",
                "monetization": "유료 연재, 아이템 판매, 계약형 수익화",
                "notes": "과도한 성적 묘사·폭력·저작권 침해 여부 확인",
            },
        ]
        bans = [
            "아동·청소년 대상 성적 묘사와 성적 착취로 해석될 수 있는 장면은 금지 또는 강한 제한 대상으로 봅니다.",
            "혐오 표현, 인종·성별·정체성 차별, 괴롭힘을 미화하는 표현은 피합니다.",
            "타 작품의 문장, 캐릭터, 이미지, 설정을 무단 차용하지 않도록 저작권 침해 여부를 점검합니다.",
            f"{modern_note}으로, 학교·직장·연애 관계에서 동의와 권력 불균형 표현을 보수적으로 검토합니다.",
        ]
        return alert, rows, bans

    if target_country == "일본":
        alert = "일본 플랫폼은 태그, 연령 등급, 장르 관습을 세밀하게 보는 편이므로 현대 장르의 감정선과 수위 구분을 명확히 해야 합니다."
        rows = [
            {"name": "Kakuyomu", "audience": "라이트노벨·웹소설 독자", "rating": "전연령~성인 구분", "monetization": "콘테스트·수익화", "notes": "태그와 줄거리 훅 설계 중요"},
            {"name": "Shōsetsuka ni Narō", "audience": "웹소설 연재 독자", "rating": "플랫폼 기준 확인", "monetization": "외부 출판 연계", "notes": "직접적 성인 묘사와 실존 대상 비방 주의"},
            {"name": "Pixiv Novel", "audience": "창작·팬덤 독자", "rating": "연령 제한 태그 필요", "monetization": "팬덤 유입·외부 연계", "notes": "태그 누락과 2차 창작 권리 문제 주의"},
        ]
        bans = [
            "연령 등급이 필요한 성적·폭력 소재는 플랫폼 기준에 맞춰 분리합니다.",
            "실존 인물·단체를 직접 비방하는 표현은 피합니다.",
            "현대 학교·직장 배경에서는 따돌림, 권력형 관계, 강압적 로맨스 묘사를 신중히 다룹니다.",
        ]
        return alert, rows, bans

    if target_country == "중국":
        alert = "중국 플랫폼은 심사 기준과 민감 소재 제한이 강하므로 정치·종교·폭력·선정성 표현을 보수적으로 점검해야 합니다."
        rows = [
            {"name": "Qidian", "audience": "장르 웹소설 독자", "rating": "플랫폼 심사 기준", "monetization": "유료 연재", "notes": "정치·폭력·선정성 표현 주의"},
            {"name": "Jinjiang", "audience": "로맨스·드라마 독자", "rating": "심사 기준 확인", "monetization": "유료 회차", "notes": "관계 윤리, 가족 윤리, 수위 조절 중요"},
            {"name": "Tencent Literature", "audience": "대중 장르 독자", "rating": "플랫폼 기준 확인", "monetization": "계약·유료 연재", "notes": "검열 민감 소재와 사회 질서 훼손 표현 주의"},
        ]
        bans = [
            "정치적 은유, 검열 민감 소재, 과도한 폭력 묘사를 주의합니다.",
            "가족 윤리와 사회 질서를 훼손하는 방향으로 읽히지 않게 조정합니다.",
            "현대 연애·직장 서사에서도 선정성과 잔혹성을 낮춰 표현합니다.",
        ]
        return alert, rows, bans

    alert = "태국 플랫폼은 관계의 위계, 존칭, 종교·왕실 관련 표현에 민감할 수 있어 현지 독자 정서를 고려한 표현 조정이 필요합니다."
    rows = [
        {"name": "ReadAWrite", "audience": "태국 웹소설 독자", "rating": "플랫폼 등급 기준", "monetization": "유료 회차 가능", "notes": "존칭·관계 위계 표현 중요"},
        {"name": "Dek-D", "audience": "청소년·젊은 독자", "rating": "청소년 보호 기준", "monetization": "작품별 상이", "notes": "직설적 모욕과 선정성 주의"},
        {"name": "Tunwalai", "audience": "로맨스·드라마 독자", "rating": "성인 등급 구분 필요", "monetization": "유료 회차·후원", "notes": "성인물 등급과 플랫폼 표시 기준 확인"},
    ]
    bans = [
        "왕실·종교·사회적 위계와 관련된 표현은 조심스럽게 다룹니다.",
        "직설적인 모욕과 차별 표현은 완곡하게 조정합니다.",
        "청소년 독자층이 많은 플랫폼에서는 선정성과 폭력 수위를 낮춥니다.",
    ]
    return alert, rows, bans

def render_guide_report(result: dict):
    target_country = result.get("target_country", "미국")
    writing = result.get("writing_direction", {}) or {}
    culture = result.get("culture_notes", {}) or {}
    platform = result.get("platform_rules", {}) or {}
    if not isinstance(platform, dict):
        platform = {}
    tips = result.get("localization_tips", {}) or {}
    if not isinstance(tips, dict):
        tips = {}
    tags = flatten_text_items(result.get("tags", []) or [])


    platform_alert, platforms, common_bans = fixed_platform_rules_for_demo(target_country, result.get("genre", "현대 로맨스"))

    culture_alert = safe_alert(
        culture.get("alert", ""),
        "문화권별 독자 반응과 표현 차이를 검토하세요.",
    )

    platform_rows = ""
    for p in platforms:
        platform_rows += f"""
        <tr>
          <td>{html_escape(clean_guide_text(p.get('name', '-')) or '-')}</td>
          <td>{html_escape(clean_guide_text(p.get('audience', '-')) or '-')}</td>
          <td>{html_escape(clean_guide_text(p.get('rating', '-')) or '-')}</td>
          <td>{html_escape(clean_guide_text(p.get('monetization', '-')) or '-')}</td>
          <td>{html_escape(clean_guide_text(p.get('notes', '-')) or '-')}</td>
        </tr>
        """

    if not platform_rows:
        platform_rows = """
        <tr><td colspan="5">생성된 플랫폼 정보가 없습니다.</td></tr>
        """

    tags_html = "".join([f"<span class='guide-tag'>{html_escape(t)}</span>" for t in tags])

    html = f"""
    <div class="guide-report">
      <div class="guide-cover">
        <div class="guide-cover-label">{html_escape(result.get('cover_label', 'Localization Guide'))}</div>
        <div class="guide-cover-title">{html_escape(result.get('target_country', '대상 국가'))} 웹소설<br><em>현지화 가이드</em></div>
        <div class="guide-cover-sub">
          <span>{html_escape(result.get('genre', '장르'))}</span>
          <span>2025–2026 기준</span>
          <span>플랫폼 · 문화 · 작성 방향</span>
        </div>
      </div>

      <div class="guide-section">
        <div class="guide-section-header">
          <span class="guide-section-num">01</span>
          <span class="guide-section-title">작성 방향</span>
        </div>
        <div class="guide-grid-2">
          <div class="guide-card">
            <div class="guide-card-title">챕터 구조</div>
            <ul class="guide-list">{render_safe_guide_list(writing.get('chapter_structure', []), 'guide-do')}</ul>
          </div>
          <div class="guide-card">
            <div class="guide-card-title">장르 공식</div>
            <ul class="guide-list">{render_safe_guide_list(writing.get('genre_formula', []), 'guide-do')}</ul>
          </div>
          <div class="guide-card">
            <div class="guide-card-title">시점 & 문체</div>
            <ul class="guide-list">{render_safe_guide_list(writing.get('pov_style', []), 'guide-do')}</ul>
          </div>
          <div class="guide-card">
            <div class="guide-card-title">캐릭터 설정</div>
            <ul class="guide-list">{render_safe_guide_list(writing.get('character_setup', []), 'guide-do')}</ul>
          </div>
        </div>
        <div class="guide-tags">{tags_html}</div>
      </div>

      <div class="guide-section">
        <div class="guide-section-header">
          <span class="guide-section-num">02</span>
          <span class="guide-section-title">문화 주의사항</span>
        </div>
        <div class="guide-alert">{html_escape(culture_alert)}</div>
        <div class="guide-grid-2">
          <div class="guide-card">
            <div class="guide-card-title">피해야 할 설정</div>
            <ul class="guide-list">{render_safe_guide_list(culture.get('avoid', []), 'guide-dont')}</ul>
          </div>
          <div class="guide-card">
            <div class="guide-card-title">선호되는 요소</div>
            <ul class="guide-list">{render_safe_guide_list(culture.get('prefer', []), 'guide-do')}</ul>
          </div>
        </div>
        <div class="guide-card">
          <div class="guide-card-title">문화 번역 필요 항목</div>
          <ul class="guide-list">{render_safe_guide_list(culture.get('translation_items', []), 'guide-warn')}</ul>
        </div>
      </div>

      <div class="guide-section">
        <div class="guide-section-header">
          <span class="guide-section-num">03</span>
          <span class="guide-section-title">플랫폼 규정</span>
        </div>
        <div class="guide-alert">{html_escape(platform_alert)}</div>
        <table class="guide-platform-table">
          <thead>
            <tr>
              <th>플랫폼</th>
              <th>주 독자층</th>
              <th>최고 등급</th>
              <th>수익화</th>
              <th>특이사항</th>
            </tr>
          </thead>
          <tbody>{platform_rows}</tbody>
        </table>
        <div class="guide-card" style="margin-top: 12px;">
          <div class="guide-card-title">공통 금지/주의</div>
          <ul class="guide-list">{render_safe_guide_list(common_bans, 'guide-dont')}</ul>
        </div>
      </div>

      <div class="guide-section">
        <div class="guide-section-header">
          <span class="guide-section-num">04</span>
          <span class="guide-section-title">현지화 팁</span>
        </div>
        <div class="guide-grid-3">
          <div class="guide-card">
            <div class="guide-card-title">번역 품질</div>
            <ul class="guide-list">{render_safe_guide_list(tips.get('translation_quality', []), 'guide-do')}</ul>
          </div>
          <div class="guide-card">
            <div class="guide-card-title">연재 전략</div>
            <ul class="guide-list">{render_safe_guide_list(tips.get('serialization_strategy', []), 'guide-do')}</ul>
          </div>
          <div class="guide-card">
            <div class="guide-card-title">마케팅 & 태그</div>
            <ul class="guide-list">{render_safe_guide_list(tips.get('marketing_tags', []), 'guide-do')}</ul>
          </div>
        </div>
      </div>
    </div>
    """
    st.markdown(html, unsafe_allow_html=True)


def init_state():
    if "user" not in st.session_state:
        st.session_state["user"] = {
            "name": "지옥에서돌아온홍길동",
            "nickname": "지옥에서돌아온홍길동",
            "email": "writer@wlighter.ai",
            "credit": 12000,
            "provider": "Google",
        }

    if "view" not in st.session_state:
        st.session_state["view"] = "works"

    if "works" not in st.session_state:
        st.session_state["works"] = [
            {
                "id": 1,
                "title": "운수 좋은 날",
                "pen_name": "현진건",
                "genre": "현대 드라마",
                "status": "회차 등록 필요",
                "created_at": "2026-05-26",
                "recent_episode_at": "-",
                "desc": "근대 도시 하층민의 하루와 비극적 아이러니를 다룬 작품",
                "thumbnail": None,
            },
        ]

    if "episodes" not in st.session_state:
        st.session_state["episodes"] = []

    if "selected_work_id" not in st.session_state:
        st.session_state["selected_work_id"] = 1

    if "selected_episode_id" not in st.session_state:
        st.session_state["selected_episode_id"] = None

    if "translations" not in st.session_state:
        st.session_state["translations"] = {}

    if "editor_chat_history" not in st.session_state:
        st.session_state["editor_chat_history"] = [
            ("ai", "번역 결과를 확인하면서 표현 수정, 현지화 이유, 문화권 오해 가능성을 질문할 수 있습니다.")
        ]

    if "credit_history" not in st.session_state:
        st.session_state["credit_history"] = [
            {
                "time": "2026-05-26 09:20",
                "type": "충전",
                "amount": "+10,000 C",
                "balance": "12,000 C",
                "feature": "Creator Credit",
                "status": "완료",
            }
        ]

    if "characters" not in st.session_state:
        st.session_state["characters"] = [
            {
                "name": "김첨지",
                "gender": "남성",
                "age": "성인",
                "appearance": "가난한 인력거꾼, 낡은 옷차림, 지친 표정과 거친 생활감이 드러나는 인물",
            },
            {
                "name": "마누라",
                "gender": "여성",
                "age": "성인",
                "appearance": "병약하고 지친 모습이지만 가족을 걱정하는 분위기의 인물",
            },
            {
                "name": "개똥이",
                "gender": "남성",
                "age": "어린아이",
                "appearance": "김첨지의 어린 아들, 소박한 옷차림과 순수한 표정의 인물",
            },
        ]

    if "generated_character_images" not in st.session_state:
        st.session_state["generated_character_images"] = {}

    if "generated_relation_maps" not in st.session_state:
        st.session_state["generated_relation_maps"] = {}

    if "translation_editor_revision" not in st.session_state:
        st.session_state["translation_editor_revision"] = {}

    if "chat_input_revision" not in st.session_state:
        st.session_state["chat_input_revision"] = 0

    if "delete_confirm_work_id" not in st.session_state:
        st.session_state["delete_confirm_work_id"] = None

    if "work_edit_saved" not in st.session_state:
        st.session_state["work_edit_saved"] = False


init_state()


def go(view: str, work_id=None, episode_id=None):
    st.session_state["view"] = view
    if work_id is not None:
        st.session_state["selected_work_id"] = work_id
    if episode_id is not None:
        st.session_state["selected_episode_id"] = episode_id
    st.rerun()


def spend_credit(amount: int, feature: str) -> bool:
    if st.session_state["user"]["credit"] < amount:
        return False

    st.session_state["user"]["credit"] -= amount
    st.session_state["credit_history"].insert(
        0,
        {
            "time": datetime.now().strftime("%Y-%m-%d %H:%M"),
            "type": "사용",
            "amount": f"-{amount:,} C",
            "balance": f"{st.session_state['user']['credit']:,} C",
            "feature": feature,
            "status": "완료",
        },
    )
    return True


def charge_credit(plan_name: str, credit_amount: int):
    st.session_state["user"]["credit"] += credit_amount
    st.session_state["credit_history"].insert(
        0,
        {
            "time": datetime.now().strftime("%Y-%m-%d %H:%M"),
            "type": "충전",
            "amount": f"+{credit_amount:,} C",
            "balance": f"{st.session_state['user']['credit']:,} C",
            "feature": plan_name,
            "status": "완료",
        },
    )


def format_krw(value: int) -> str:
    return f"{value:,}원"


def format_credit(value: int) -> str:
    return f"{value:,} C"


def truncate_title(title: str, limit: int = 30) -> str:
    return title if len(title) <= limit else title[:limit - 1] + "…"


def make_thumbnail_data(uploaded_file):
    if uploaded_file is None:
        return None

    raw = uploaded_file.getvalue()
    encoded = base64.b64encode(raw).decode("utf-8")
    return {
        "name": uploaded_file.name,
        "mime": uploaded_file.type,
        "data": encoded,
    }


def render_work_thumbnail(work: dict):
    thumbnail = work.get("thumbnail")

    if isinstance(thumbnail, dict) and thumbnail.get("data") and thumbnail.get("mime"):
        st.markdown(
            f"""
            <img
                src="data:{thumbnail['mime']};base64,{thumbnail['data']}"
                class="work-thumbnail"
                alt="작품 썸네일"
            />
            """,
            unsafe_allow_html=True,
        )
    else:
        st.markdown(
            """
            <div class="work-thumbnail-placeholder">
                <div class="default-cover">
                    <div class="cover-star">✦</div>
                    <div class="cover-lines">
                        <span></span>
                        <span></span>
                        <span></span>
                    </div>
                </div>
            </div>
            """,
            unsafe_allow_html=True,
        )


def render_work_thumbnail_detail(work: dict):
    thumbnail = work.get("thumbnail")

    if isinstance(thumbnail, dict) and thumbnail.get("data") and thumbnail.get("mime"):
        st.markdown(
            f"""
            <img
                src="data:{thumbnail['mime']};base64,{thumbnail['data']}"
                class="work-thumbnail-detail"
                alt="작품 썸네일"
            />
            """,
            unsafe_allow_html=True,
        )
    else:
        st.markdown(
            """
            <div class="work-thumbnail-detail-placeholder">
                <div class="default-cover-detail">
                    <div class="cover-star">✦</div>
                    <div class="cover-lines">
                        <span></span>
                        <span></span>
                        <span></span>
                    </div>
                </div>
            </div>
            """,
            unsafe_allow_html=True,
        )


def get_work(work_id=None):
    work_id = work_id or st.session_state["selected_work_id"]
    return next(w for w in st.session_state["works"] if w["id"] == work_id)


def get_episode(episode_id=None):
    episode_id = episode_id or st.session_state["selected_episode_id"]
    return next(e for e in st.session_state["episodes"] if e["id"] == episode_id)


def get_episodes_for_work(work_id=None):
    work_id = work_id or st.session_state["selected_work_id"]
    return [e for e in st.session_state["episodes"] if e["work_id"] == work_id]


def get_translation_count_for_work(work_id: int) -> int:
    episode_ids = [e["id"] for e in st.session_state["episodes"] if e["work_id"] == work_id]
    return len([k for k in st.session_state["translations"].keys() if k[0] in episode_ids])


def build_checkout_url(plan_name: str, plan: dict) -> str:
    params = {
        "clientKey": TOSS_CLIENT_KEY,
        "orderId": f"wlighter_{uuid.uuid4().hex}",
        "orderName": plan_name,
        "amount": plan["price"],
        "customerEmail": st.session_state["user"]["email"],
        "customerName": st.session_state["user"]["name"],
        "successUrl": STREAMLIT_BASE_URL,
        "failUrl": STREAMLIT_BASE_URL,
    }
    return f"{CHECKOUT_BASE_URL}?{urlencode(params)}"


def confirm_toss_payment(payment_key: str, order_id: str, amount: int):
    if not TOSS_SECRET_KEY:
        raise ValueError("TOSS_SECRET_KEY가 .env에 설정되어 있지 않습니다.")

    encoded_secret_key = base64.b64encode(
        f"{TOSS_SECRET_KEY}:".encode("utf-8")
    ).decode("utf-8")

    headers = {
        "Authorization": f"Basic {encoded_secret_key}",
        "Content-Type": "application/json",
    }

    body = {
        "paymentKey": payment_key,
        "orderId": order_id,
        "amount": amount,
    }

    response = requests.post(
        "https://api.tosspayments.com/v1/payments/confirm",
        headers=headers,
        json=body,
        timeout=15,
    )

    if response.status_code != 200:
        raise RuntimeError(response.text)

    return response.json()


def plan_by_amount(amount: int):
    for name, plan in CREDIT_PLANS.items():
        if plan["price"] == amount:
            return name, plan
    return None, None


def delete_work_and_related_data(work_id: int):
    episode_ids = [e["id"] for e in st.session_state["episodes"] if e["work_id"] == work_id]

    st.session_state["works"] = [w for w in st.session_state["works"] if w["id"] != work_id]
    st.session_state["episodes"] = [e for e in st.session_state["episodes"] if e["work_id"] != work_id]

    keys_to_delete = [k for k in st.session_state["translations"].keys() if k[0] in episode_ids]
    for k in keys_to_delete:
        del st.session_state["translations"][k]

    st.session_state["delete_confirm_work_id"] = None

    if st.session_state["works"]:
        st.session_state["selected_work_id"] = st.session_state["works"][0]["id"]
    else:
        st.session_state["selected_work_id"] = None


def render_sidebar():
    logo_path = Path(__file__).resolve().parent / "logo.png"

    with st.sidebar:
        if logo_path.exists():
            st.image(str(logo_path), use_container_width=True)
        else:
            st.markdown(
                """
                <div class="sidebar-logo-fallback">
                    w.<span>LiGHTER</span>
                </div>
                """,
                unsafe_allow_html=True,
            )

        st.markdown(
            """
            <div class="sidebar-subtitle">
                Web Novel Localization Studio
            </div>
            """,
            unsafe_allow_html=True,
        )

        st.markdown('<div class="sidebar-section-title">로그인 계정</div>', unsafe_allow_html=True)
        st.markdown(
            f"""
            <div class="sidebar-user-card">
                <div class="sidebar-user-name">{st.session_state['user']['name']}</div>
                <div class="sidebar-user-email">{st.session_state['user']['provider']} · {st.session_state['user']['email']}</div>
            </div>
            """,
            unsafe_allow_html=True,
        )

        st.markdown(
            f"""
            <div class="sidebar-credit-card">
                <div class="sidebar-credit-label">보유 크레딧</div>
                <div class="sidebar-credit-value">{st.session_state['user']['credit']:,} C</div>
            </div>
            """,
            unsafe_allow_html=True,
        )

        st.markdown('<div class="sidebar-section-title">메뉴</div>', unsafe_allow_html=True)
        if st.button("작품", use_container_width=True):
            go("works")
        if st.button("이미지/관계도", use_container_width=True):
            go("visuals")
        if st.button("현지화 가이드", use_container_width=True):
            go("guide")
        if st.button("크레딧 충전", use_container_width=True):
            go("credit")

        st.markdown('<div class="sidebar-section-title">관리</div>', unsafe_allow_html=True)
        if st.button("시연 데이터 초기화", use_container_width=True):
            for key in list(st.session_state.keys()):
                del st.session_state[key]
            st.rerun()


def render_breadcrumb():
    view = st.session_state["view"]
    label = "작품"
    if view == "work_detail":
        label = f"작품 > {get_work()['title']}"
    elif view == "work_edit":
        label = f"작품 > {get_work()['title']} > 작품 정보 수정"
    elif view == "episode_translate":
        label = f"작품 > {get_work()['title']} > {get_episode()['title']} > 번역하기"
    elif view == "episode_view":
        label = f"작품 > {get_work()['title']} > {get_episode()['title']} > 회차 보기"
    elif view == "episode_form":
        label = f"작품 > {get_work()['title']} > 회차 등록"
    elif view == "work_form":
        label = "작품 > 새 작품 등록"
    elif view == "visuals":
        label = "이미지/관계도"
    elif view == "guide":
        label = "현지화 가이드"
    elif view == "credit":
        label = "크레딧 충전"
    elif view == "payment_result":
        label = "크레딧 충전 > 결제 승인"

    st.caption(label)


def handle_payment_result_from_toss():
    query_params = st.query_params

    payment_key = query_params.get("paymentKey")
    order_id = query_params.get("orderId")
    amount = query_params.get("amount")
    fail_code = query_params.get("code")
    fail_message = query_params.get("message")

    if fail_code or fail_message:
        st.error("결제를 완료하지 못했습니다.")
        if fail_code:
            st.write(f"오류 코드: `{fail_code}`")
        if fail_message:
            st.write(f"오류 메시지: {fail_message}")

        if st.button("크레딧 충전 화면으로 돌아가기", type="primary"):
            st.query_params.clear()
            go("credit")
        return True

    if not payment_key or not order_id or not amount:
        return False

    st.session_state["view"] = "payment_result"

    render_breadcrumb()
    st.markdown('<div class="section-title">크레딧 충전 확인</div>', unsafe_allow_html=True)
    st.caption("토스페이먼츠 결제 정보가 확인되었습니다. 승인 요청 후 크레딧이 반영됩니다.")

    try:
        amount_int = int(amount)
    except ValueError:
        st.error("결제 금액 값이 올바르지 않습니다.")
        return True

    plan_name, plan = plan_by_amount(amount_int)
    if not plan:
        st.error("등록되지 않은 결제 금액입니다.")
        return True

    c1, c2 = st.columns([1.1, 0.9])
    with c1:
        with st.container(border=True):
            st.subheader("결제 요청 정보")
            st.write(f"상품명: **{plan_name}**")
            st.write(f"주문번호: `{order_id}`")
            st.write(f"결제금액: **{format_krw(amount_int)}**")
            st.write(f"충전 예정 크레딧: **{format_credit(plan['credit'])}**")
    with c2:
        st.metric("현재 보유 크레딧", format_credit(st.session_state["user"]["credit"]))
        st.metric("충전 후 크레딧", format_credit(st.session_state["user"]["credit"] + plan["credit"]))

    st.divider()

    if "payment_orders" not in st.session_state:
        st.session_state["payment_orders"] = []

    if order_id in [h.get("order_id") for h in st.session_state["payment_orders"]]:
        st.info("이미 승인 처리된 주문입니다.")
        if st.button("크레딧 충전 화면으로 돌아가기"):
            st.query_params.clear()
            go("credit")
        return True

    if st.button("결제 승인 및 크레딧 반영", type="primary", use_container_width=True):
        try:
            result = confirm_toss_payment(payment_key, order_id, amount_int)
            charge_credit(plan_name, plan["credit"])

            st.session_state["payment_orders"].append(
                {
                    "order_id": order_id,
                    "payment_key": payment_key,
                    "approved_at": result.get("approvedAt"),
                }
            )

            st.success("결제 승인 및 크레딧 충전이 완료되었습니다.")
            st.metric("현재 보유 크레딧", format_credit(st.session_state["user"]["credit"]))

            with st.expander("결제 상세 정보"):
                st.write(f"결제수단: {result.get('method')}")
                st.write(f"결제상태: {result.get('status')}")
                st.write(f"승인일시: {result.get('approvedAt')}")

            if st.button("충전 화면으로 돌아가기"):
                st.query_params.clear()
                go("credit")

        except Exception as e:
            st.error("결제 승인 중 오류가 발생했습니다.")
            st.code(str(e))

    return True


def page_works():
    render_breadcrumb()

    top_left, top_mid, top_right = st.columns([0.56, 0.24, 0.20], vertical_alignment="bottom")

    with top_left:
        st.markdown('<div class="section-title">작품 목록</div>', unsafe_allow_html=True)
        st.markdown(
            '<div class="section-sub">작품별 회차를 관리하고, 필요한 회차부터 번역 작업을 시작해 보세요.</div>',
            unsafe_allow_html=True,
        )

    with top_mid:
        sort_option = st.selectbox(
            "정렬",
            ["최근 회차 등록일순", "작품 등록일순", "작품 이름순"],
        )

    with top_right:
        if st.button("새 작품 등록", type="primary", use_container_width=True):
            go("work_form")

    st.divider()

    works = st.session_state["works"].copy()
    if sort_option == "작품 이름순":
        works.sort(key=lambda w: w["title"])
    elif sort_option == "작품 등록일순":
        works.sort(key=lambda w: w["created_at"], reverse=True)
    else:
        works.sort(key=lambda w: w.get("recent_episode_at", "-"), reverse=True)

    if not works:
        st.info("등록된 작품이 없습니다. 새 작품 등록 버튼을 눌러 작품을 추가하세요.")
        return

    for work in works:
        episodes = get_episodes_for_work(work["id"])
        translated_count = get_translation_count_for_work(work["id"])
        display_title = truncate_title(work["title"], 30)

        with st.container(border=True):
            thumb_col, info_col, episode_col, trans_col, action_col = st.columns(
                [0.28, 1.36, 0.42, 0.42, 0.58]
            )

            with thumb_col:
                render_work_thumbnail(work)

            with info_col:
                st.markdown(f"### {display_title}")
                st.caption(f"필명: {work['pen_name']} · 등록일: {work['created_at']}")
                st.write(work.get("desc", "작품 설명이 등록되지 않았습니다."))
                st.markdown(
                    f"""
                    <span class="pill">{work['genre']}</span>
                    """,
                    unsafe_allow_html=True,
                )

            with episode_col:
                st.metric("회차", f"{len(episodes)}개")

            with trans_col:
                st.metric("번역 결과", f"{translated_count}건")

            with action_col:
                if st.button("작품 보기", key=f"open_work_{work['id']}", type="primary", use_container_width=True):
                    go("work_detail", work_id=work["id"])
                if st.button("정보 수정", key=f"edit_work_{work['id']}", use_container_width=True):
                    go("work_edit", work_id=work["id"])


def validate_thumbnail(uploaded_file):
    if uploaded_file is None:
        return True, "썸네일 미등록: 기본 이미지가 적용됩니다."

    allowed = ["image/jpeg", "image/png"]
    if uploaded_file.type not in allowed:
        return False, "썸네일 확장자는 jpeg, jpg, png만 허용됩니다."

    size_mb = uploaded_file.size / (1024 * 1024)
    if size_mb > 2:
        return False, "썸네일 용량은 2MB 이하만 허용됩니다."

    return True, "썸네일이 등록되었습니다."


def page_work_form():
    render_breadcrumb()
    st.markdown('<div class="section-title">작품 등록</div>', unsafe_allow_html=True)
    st.caption("제목과 장르를 먼저 등록한 뒤, 회차 원문은 나중에 추가할 수 있습니다.")

    with st.container(border=True):
        c1, c2, c3 = st.columns([1.2, 1, 1])
        title = c1.text_input("작품 제목", placeholder="최대 50자")
        pen_name = c2.text_input("필명", value=st.session_state["user"]["nickname"])
        genre = c3.selectbox("장르", GENRES)
        desc = st.text_area("작품 설명", placeholder="작품 소개 또는 현지화 참고 메모를 입력하세요.", height=100)

        thumbnail = st.file_uploader("썸네일 이미지", type=["jpg", "jpeg", "png"])
        ok, thumbnail_msg = validate_thumbnail(thumbnail)
        if ok:
            st.caption(thumbnail_msg)
        else:
            st.error(thumbnail_msg)

        with st.expander("작품 등록 시 첫 회차도 함께 등록하기"):
            add_first_episode = st.checkbox("첫 회차 원문을 함께 등록합니다.")
            first_ep_title = ""
            first_ep_body = ""
            if add_first_episode:
                first_ep_title = st.text_input("첫 회차 제목", value="1화.")
                first_ep_mode = st.radio("첫 회차 등록 방식", ["직접 작성", "파일 업로드"], horizontal=True)
                if first_ep_mode == "파일 업로드":
                    st.file_uploader("첫 회차 파일 업로드", type=["txt", "docx"], key="first_ep_file")
                    st.info("시연에서는 파일 본문 추출 대신 아래 입력창에서 원문을 확인/수정하는 흐름으로 구성했습니다.")
                first_ep_body = st.text_area("첫 회차 원문", value=SAMPLE_TEXT, height=220)
                st.caption(f"첫 회차 글자 수: {len(first_ep_body):,} / 8,000자")

        c1, c2 = st.columns([1, 1])
        if c1.button("작품 저장", type="primary", use_container_width=True):
            if not title.strip() or not pen_name.strip() or not genre:
                st.error("작품 제목, 필명, 장르는 필수 입력 항목입니다.")
            elif len(title) > 50:
                st.error("작품 제목은 최대 50자까지 입력할 수 있습니다.")
            elif not ok:
                st.error(thumbnail_msg)
            elif add_first_episode and len(first_ep_body) > 8000:
                st.error("첫 회차 원문은 8,000자까지 등록할 수 있습니다.")
            elif add_first_episode and not first_ep_title.strip():
                st.error("첫 회차 제목을 입력해 주세요.")
            else:
                new_id = max([w["id"] for w in st.session_state["works"]], default=0) + 1
                now = datetime.now().strftime("%Y-%m-%d")

                st.session_state["works"].append(
                    {
                        "id": new_id,
                        "title": title.strip(),
                        "pen_name": pen_name.strip(),
                        "genre": genre,
                        "status": "번역 가능" if add_first_episode else "회차 등록 필요",
                        "created_at": now,
                        "recent_episode_at": now if add_first_episode else "-",
                        "desc": desc.strip() or "작품 설명이 등록되지 않았습니다.",
                        "thumbnail": make_thumbnail_data(thumbnail),
                    }
                )

                if add_first_episode:
                    ep_id = max([e["id"] for e in st.session_state["episodes"]], default=0) + 1
                    st.session_state["episodes"].append(
                        {
                            "id": ep_id,
                            "work_id": new_id,
                            "title": first_ep_title.strip(),
                            "body": first_ep_body,
                            "status": "번역 전",
                            "created_at": now,
                            "updated_at": now,
                        }
                    )
                    st.session_state["selected_episode_id"] = ep_id

                st.session_state["selected_work_id"] = new_id
                st.success("작품이 저장되었습니다.")
                go("work_detail", work_id=new_id)

        if c2.button("취소", use_container_width=True):
            go("works")


def page_work_edit():
    work = get_work()
    render_breadcrumb()
    st.markdown('<div class="section-title">작품 정보 수정</div>', unsafe_allow_html=True)
    st.caption("작품 정보는 언제든 수정할 수 있으며, 변경 내용은 작품 목록에 바로 반영됩니다.")

    if st.session_state.get("work_edit_saved"):
        st.success("작품 정보가 수정되었습니다.")
        c1, c2 = st.columns([1, 1])
        if c1.button("작품 상세로 이동", type="primary", use_container_width=True):
            st.session_state["work_edit_saved"] = False
            go("work_detail", work_id=work["id"])
        if c2.button("작품 목록으로 이동", use_container_width=True):
            st.session_state["work_edit_saved"] = False
            go("works")

    with st.container(border=True):
        c1, c2, c3 = st.columns([1.2, 1, 1])
        new_title = c1.text_input("작품 제목", value=work["title"])
        new_pen_name = c2.text_input("필명", value=work["pen_name"])
        new_genre = c3.selectbox("장르", GENRES, index=GENRES.index(work["genre"]) if work["genre"] in GENRES else 0)
        new_desc = st.text_area("작품 설명", value=work.get("desc", ""), height=100)
        thumbnail = st.file_uploader("썸네일 이미지 변경", type=["jpg", "jpeg", "png"])
        ok, thumbnail_msg = validate_thumbnail(thumbnail)
        if ok:
            st.caption(thumbnail_msg)
        else:
            st.error(thumbnail_msg)

        c1, c2 = st.columns([1, 1])
        if c1.button("수정 저장", type="primary", use_container_width=True):
            if not new_title.strip() or not new_pen_name.strip() or not new_genre:
                st.error("작품 제목, 필명, 장르는 비어 있을 수 없습니다.")
            elif len(new_title) > 50:
                st.error("작품 제목은 최대 50자까지 입력할 수 있습니다.")
            elif not ok:
                st.error(thumbnail_msg)
            else:
                work["title"] = new_title.strip()
                work["pen_name"] = new_pen_name.strip()
                work["genre"] = new_genre
                work["desc"] = new_desc.strip() or "작품 설명이 등록되지 않았습니다."
                if thumbnail:
                    work["thumbnail"] = make_thumbnail_data(thumbnail)
                st.session_state["work_edit_saved"] = True
                st.rerun()

        if c2.button("취소", use_container_width=True):
            st.session_state["work_edit_saved"] = False
            go("work_detail", work_id=work["id"])


def page_work_detail():
    work = get_work()

    render_breadcrumb()

    top_thumb, top_left, top_right = st.columns([0.22, 0.54, 0.24])
    with top_thumb:
        render_work_thumbnail_detail(work)

    with top_left:
        st.markdown(f'<div class="section-title">{work["title"]}</div>', unsafe_allow_html=True)
        st.markdown(
            f"""
            <div class="section-sub">
                {work.get('desc', '작품 설명이 등록되지 않았습니다.')}
            </div>
            <span class="pill">{work['genre']}</span>
            <span class="pill pill-green">등록일 {work['created_at']}</span>
            """,
            unsafe_allow_html=True,
        )
        st.caption(f"필명: {work['pen_name']}")

    with top_right:
        if st.button("작품 목록으로", use_container_width=True):
            go("works")
        if st.button("작품 정보 수정", use_container_width=True):
            go("work_edit", work_id=work["id"])
        if st.button("회차 등록/작성", type="primary", use_container_width=True):
            go("episode_form", work_id=work["id"])

        if st.session_state["delete_confirm_work_id"] == work["id"]:
            st.error("삭제 확인 중")
            if st.button("최종 삭제", type="primary", use_container_width=True):
                delete_work_and_related_data(work["id"])
                st.success("작품이 삭제되었습니다.")
                go("works")
            if st.button("삭제 취소", use_container_width=True):
                st.session_state["delete_confirm_work_id"] = None
                st.rerun()
        else:
            if st.button("작품 삭제", use_container_width=True):
                st.session_state["delete_confirm_work_id"] = work["id"]
                st.rerun()

    st.divider()

    episodes = get_episodes_for_work(work["id"])

    c1, c2 = st.columns(2)
    c1.metric("등록 회차", f"{len(episodes)}개")
    c2.metric("번역 결과", f"{get_translation_count_for_work(work['id'])}건")

    st.divider()

    st.markdown("### 회차 목록")

    if not episodes:
        st.info("아직 등록된 회차가 없습니다. 회차 등록/작성 버튼을 눌러 첫 회차를 추가하세요.")
        return

    for idx, ep in enumerate(episodes, 1):
        has_translation = any(k[0] == ep["id"] for k in st.session_state["translations"].keys())
        translated_label = "번역 완료" if has_translation else "번역 전"

        with st.container(border=True):
            info_col, date_col, action_col = st.columns([1.55, 0.62, 0.62])

            with info_col:
                st.markdown(f"### {idx}. {ep['title']}")
                st.caption(ep["body"][:130] + ("..." if len(ep["body"]) > 130 else ""))
                st.markdown(
                    f"""
                    <span class="pill">{translated_label}</span>
                    <span class="pill pill-blue">{len(ep['body']):,}자</span>
                    """,
                    unsafe_allow_html=True,
                )

            with date_col:
                st.write("등록일")
                st.write(ep["created_at"])
                st.write("수정일")
                st.write(ep.get("updated_at", ep["created_at"]))

            with action_col:
                if st.button("번역하기", key=f"translate_ep_{ep['id']}", type="primary", use_container_width=True):
                    go("episode_translate", work_id=work["id"], episode_id=ep["id"])
                if st.button("회차 보기", key=f"open_ep_{ep['id']}", use_container_width=True):
                    go("episode_view", work_id=work["id"], episode_id=ep["id"])


def page_episode_form():
    work = get_work()
    render_breadcrumb()

    st.markdown(f'<div class="section-title">{work["title"]} · 회차 등록</div>', unsafe_allow_html=True)
    st.caption("원문을 직접 입력하거나 파일로 올려 회차를 추가할 수 있습니다.")

    with st.container(border=True):
        ep_title = st.text_input("회차 제목", placeholder="예: 1화. 첫 만남")
        input_mode = st.radio("등록 방식", ["직접 작성", "파일 업로드"], horizontal=True)

        if input_mode == "직접 작성":
            body_text = st.text_area("회차 원문", value=SAMPLE_TEXT, height=300)
        else:
            uploaded = st.file_uploader("회차 파일 업로드", type=["txt", "docx"])
            st.info("시연에서는 파일 본문 추출 대신 아래 입력창에서 원문을 확인/수정하는 흐름으로 구성했습니다.")
            body_text = st.text_area("추출된 본문 확인/수정", value=SAMPLE_TEXT, height=300)

        char_count = len(body_text)
        st.caption(f"현재 글자 수: {char_count:,} / 8,000자")

        c1, c2 = st.columns([1, 1])
        if c1.button("회차 저장", type="primary", use_container_width=True):
            if not ep_title.strip():
                st.error("회차 제목을 입력해 주세요.")
            elif len(ep_title) > 30:
                st.error("회차 제목은 최대 30자까지 입력할 수 있습니다.")
            elif char_count > 8000:
                st.error("회차 원문은 8,000자까지 등록할 수 있습니다.")
            else:
                new_id = max([e["id"] for e in st.session_state["episodes"]], default=0) + 1
                now = datetime.now().strftime("%Y-%m-%d")
                st.session_state["episodes"].append(
                    {
                        "id": new_id,
                        "work_id": work["id"],
                        "title": ep_title.strip(),
                        "body": body_text,
                        "status": "번역 전",
                        "created_at": now,
                        "updated_at": now,
                    }
                )
                work["status"] = "번역 가능"
                work["recent_episode_at"] = now
                st.session_state["selected_episode_id"] = new_id
                st.success("회차가 저장되었습니다.")
                go("work_detail", work_id=work["id"])

        if c2.button("취소", use_container_width=True):
            go("work_detail", work_id=work["id"])


def run_translation(episode, target_country):
    key = (episode["id"], target_country)

    result = call_llm_translation_and_review(
        source_text=episode["body"],
        target_country=target_country,
    )

    st.session_state["translations"][key] = {
        "country": target_country,
        "original": episode["body"],
        "localized": result["final_translation"],
        "review_summary": result["review_summary"],
        "rag_used": result["rag_used"],
        "rag_status": result["rag_status"],
        "rag_dir": result["rag_dir"],
        "created_at": result["created_at"],
    }

    episode["status"] = "번역 완료"
    episode["updated_at"] = datetime.now().strftime("%Y-%m-%d")
    return st.session_state["translations"][key]


def get_translation(episode, target_country):
    key = (episode["id"], target_country)
    return st.session_state["translations"].get(key)


def clear_episode_translation_state(episode_id: int):
    """원문 수정 시 기존 번역/검수 결과가 이전 원문 기준으로 남지 않도록 정리."""
    keys_to_delete = [key for key in st.session_state["translations"].keys() if key[0] == episode_id]
    for key in keys_to_delete:
        del st.session_state["translations"][key]

    st.session_state["editor_chat_history"] = []
    st.session_state["last_chat_proposed_translation"] = ""


def bump_translation_editor_revision(episode_id: int, target_country: str):
    """text_area 위젯 key를 새로 만들어 변경된 번역 데이터를 다시 표시하기 위한 revision 증가."""
    key = f"{episode_id}_{target_country}"
    revisions = st.session_state.setdefault("translation_editor_revision", {})
    revisions[key] = revisions.get(key, 0) + 1


def get_translation_editor_key(episode_id: int, target_country: str) -> str:
    key = f"{episode_id}_{target_country}"
    revision = st.session_state.setdefault("translation_editor_revision", {}).get(key, 0)
    return f"final_translation_editor_{episode_id}_{target_country}_{revision}"


def page_episode_translate():
    work = get_work()
    episode = get_episode()

    render_breadcrumb()

    top_left, top_right = st.columns([0.72, 0.28])
    with top_left:
        st.markdown(f'<div class="section-title">{episode["title"]} · 번역하기</div>', unsafe_allow_html=True)
        st.caption("원문을 다듬은 뒤 번역을 실행하고, 결과를 보며 표현을 함께 조정할 수 있습니다.")
    with top_right:
        if st.button("작품 상세로 돌아가기", use_container_width=True):
            go("work_detail", work_id=work["id"])

    c1, c2 = st.columns([0.7, 1.3])
    target_country = c1.selectbox("대상 국가", TARGET_COUNTRIES, key="editor_target_country")
    c2.info("선택한 국가의 표현 기준과 문화권 참고자료를 반영합니다.")

    result = get_translation(episode, target_country)

    if st.button("번역 시작", type="primary", use_container_width=True):
        if not spend_credit(800, "회차 번역"):
            st.error("크레딧이 부족합니다. 크레딧 충전 후 다시 시도해 주세요.")
        else:
            try:
                with st.spinner("번역과 검수 결과를 생성 중입니다..."):
                    result = run_translation(episode, target_country)
                st.success("번역 결과가 생성되었습니다.")
            except Exception as exc:
                st.error(f"번역 생성 중 문제가 발생했습니다: {exc}")

    st.divider()

    main_col, chat_col = st.columns([1.25, 0.85], gap="large")

    with main_col:
        view_mode = st.radio(
            "본문 보기",
            ["원문", "번역본"],
            horizontal=True,
            label_visibility="collapsed",
        )

        if view_mode == "원문":
            st.markdown("### 원문 수정")
            edited_source = st.text_area(
                "원문",
                value=episode["body"],
                height=480,
                label_visibility="collapsed",
                key=f"source_editor_{episode['id']}",
            )
            st.caption(f"글자 수: {len(edited_source):,} / 8,000자")

            save_col, translate_col = st.columns([1, 1])

            if save_col.button("원문 저장", type="primary", use_container_width=True):
                if not edited_source.strip():
                    st.error("원문 내용은 비어 있을 수 없습니다.")
                elif len(edited_source) > 8000:
                    st.error("회차 원문은 8,000자까지 저장할 수 있습니다.")
                else:
                    episode["body"] = edited_source
                    episode["updated_at"] = datetime.now().strftime("%Y-%m-%d")
                    episode["status"] = "원문 수정됨"
                    clear_episode_translation_state(episode["id"])
                    st.success("원문이 저장되었습니다. 기존 번역 결과는 이전 원문 기준이므로 초기화되었습니다.")
                    st.rerun()

            if translate_col.button("저장 후 번역 시작", use_container_width=True):
                if not edited_source.strip():
                    st.error("원문 내용은 비어 있을 수 없습니다.")
                elif len(edited_source) > 8000:
                    st.error("회차 원문은 8,000자까지 저장할 수 있습니다.")
                elif not spend_credit(800, "회차 번역"):
                    st.error("크레딧이 부족합니다. 크레딧 충전 후 다시 시도해 주세요.")
                else:
                    try:
                        episode["body"] = edited_source
                        episode["updated_at"] = datetime.now().strftime("%Y-%m-%d")
                        episode["status"] = "원문 수정됨"
                        clear_episode_translation_state(episode["id"])

                        with st.spinner("번역과 검수 결과를 생성 중입니다..."):
                            result = run_translation(episode, target_country)
                        st.success("원문 저장 후 번역 결과가 생성되었습니다.")
                        st.rerun()
                    except Exception as exc:
                        st.error(f"번역 생성 중 문제가 발생했습니다: {exc}")
        else:
            if not result:
                st.info("아직 번역 결과가 없습니다. 상단의 번역 시작 버튼을 눌러주세요.")
            else:
                tab_final, tab_review = st.tabs(["최종 번역", "검수 요약"])

                with tab_final:
                    st.markdown("### 최종 번역")
                    editor_key = get_translation_editor_key(episode["id"], target_country)
                    edited_localized = st.text_area(
                        "최종 번역",
                        value=result.get("localized", ""),
                        height=430,
                        label_visibility="collapsed",
                        key=editor_key,
                    )
                    result["localized"] = edited_localized

                    if st.button("최종 번역 저장", type="primary", use_container_width=True):
                        episode["status"] = "번역 저장됨"
                        episode["updated_at"] = datetime.now().strftime("%Y-%m-%d")
                        st.success("최종 번역이 저장되었습니다.")
                        go("work_detail", work_id=work["id"])

                with tab_review:
                    st.markdown("### 검수 요약")
                    review_summary = result.get("review_summary", "").strip()
                    if review_summary:
                        st.markdown(
                            "<div class='review-summary-box'>"
                            + review_summary.replace("\\n", "\n").replace("\n", "<br>")
                            + "</div>",
                            unsafe_allow_html=True,
                        )
                    else:
                        st.info("검수 요약이 아직 생성되지 않았습니다.")


    with chat_col:
        st.markdown("### 번역 및 검수 챗봇")

        if not result:
            st.info("먼저 번역을 실행하면 챗봇을 사용할 수 있습니다.")
            return

        if "editor_chat_history" not in st.session_state:
            st.session_state["editor_chat_history"] = []

        with st.container(border=True):
            if not st.session_state["editor_chat_history"]:
                st.caption("번역 결과를 보면서 질문이나 수정 요청을 입력해 주세요.")

            for role, msg in st.session_state["editor_chat_history"][-8:]:
                css = "chat-bubble-user" if role == "user" else "chat-bubble-ai"
                st.markdown(f'<div class="{css}">{msg}</div>', unsafe_allow_html=True)

        chat_input_key = f"chat_input_{st.session_state.get('chat_input_revision', 0)}"
        user_msg = st.text_area(
            "채팅 입력",
            placeholder="예: 왜 이렇게 번역했어? / 더 자연스럽게 바꿔줘 / 이 표현 위험하지 않아?",
            height=95,
            key=chat_input_key,
        )

        if st.button("챗봇에 보내기", type="primary", use_container_width=True):
            if not user_msg.strip():
                st.error("질문 또는 수정 요청을 입력해 주세요.")
            elif not spend_credit(150, "번역 검수 챗봇"):
                st.error("크레딧이 부족합니다.")
            else:
                try:
                    st.session_state["editor_chat_history"].append(("user", user_msg))
                    with st.spinner("챗봇이 답변을 생성 중입니다..."):
                        reply = call_llm_chatbot(
                            source_text=episode["body"],
                            current_translation=result.get("localized", ""),
                            review_summary=result.get("review_summary", ""),
                            target_country=target_country,
                            user_message=user_msg,
                            chat_history=st.session_state["editor_chat_history"],
                        )

                    st.session_state["editor_chat_history"].append(("ai", reply["answer"]))
                    st.session_state["last_chat_proposed_translation"] = reply.get("proposed_translation", "")
                    st.session_state["chat_input_revision"] = st.session_state.get("chat_input_revision", 0) + 1
                    st.rerun()
                except Exception as exc:
                    st.error(f"답변 생성 중 문제가 발생했습니다: {exc}")

        proposed = st.session_state.get("last_chat_proposed_translation", "")
        if proposed:
            st.markdown("#### 수정 반영 미리보기")
            st.text_area("수정된 번역본", value=proposed, height=180, disabled=True)
            if st.button("제안을 최종 번역에 반영", use_container_width=True):


                result["localized"] = proposed
                bump_translation_editor_revision(episode["id"], target_country)
                st.session_state["last_chat_proposed_translation"] = ""
                st.success("제안 번역을 최종 번역에 반영했습니다.")
                st.rerun()

        c1, c2 = st.columns(2)
        if c1.button("작업 저장 후 나가기", type="primary", use_container_width=True):
            episode["status"] = "번역 저장됨"
            episode["updated_at"] = datetime.now().strftime("%Y-%m-%d")
            go("work_detail", work_id=work["id"])

        if c2.button("저장 없이 나가기", use_container_width=True):
            go("work_detail", work_id=work["id"])


def page_episode_view():
    work = get_work()
    episode = get_episode()

    render_breadcrumb()

    top_left, top_right = st.columns([0.72, 0.28])
    with top_left:
        st.markdown(f'<div class="section-title">{episode["title"]} · 회차 보기</div>', unsafe_allow_html=True)
        st.caption("회차 원문과 저장된 번역본을 확인하고 필요한 부분을 수정할 수 있습니다.")
    with top_right:
        if st.button("작품 상세로 돌아가기", use_container_width=True):
            go("work_detail", work_id=work["id"])
        if st.button("번역하기로 이동", type="primary", use_container_width=True):
            go("episode_translate", work_id=work["id"], episode_id=episode["id"])

    st.divider()

    target_country = st.selectbox("번역본 대상 국가", TARGET_COUNTRIES, key="view_target_country")
    result = get_translation(episode, target_country)

    view_mode = st.radio(
        "본문 보기",
        ["원문", "번역본"],
        horizontal=True,
        label_visibility="collapsed",
        key=f"episode_view_mode_{episode['id']}",
    )

    if view_mode == "원문":
        st.markdown("### 원문")
        edited_source = st.text_area(
            "원문",
            value=episode["body"],
            height=520,
            label_visibility="collapsed",
            key=f"episode_view_source_{episode['id']}",
        )
        st.caption(f"글자 수: {len(edited_source):,} / 8,000자")

        if st.button("원문 저장", type="primary", use_container_width=True):
            if not edited_source.strip():
                st.error("원문 내용은 비어 있을 수 없습니다.")
            elif len(edited_source) > 8000:
                st.error("회차 원문은 8,000자까지 저장할 수 있습니다.")
            else:
                episode["body"] = edited_source
                episode["updated_at"] = datetime.now().strftime("%Y-%m-%d")
                episode["status"] = "원문 수정됨"
                clear_episode_translation_state(episode["id"])
                st.success("원문이 저장되었습니다. 기존 번역 결과는 이전 원문 기준이므로 초기화되었습니다.")
                st.rerun()

    else:
        st.markdown("### 번역본")

        if not result:
            st.info("아직 저장된 번역본이 없습니다. 번역하기 화면에서 번역을 먼저 실행해 주세요.")
            return

        tab_final, tab_review = st.tabs(["최종 번역", "검수 요약"])

        with tab_final:
            edited_translation = st.text_area(
                "최종 번역",
                value=result.get("localized", ""),
                height=430,
                label_visibility="collapsed",
                key=f"episode_view_translation_{episode['id']}_{target_country}",
            )

            if st.button("번역본 저장", type="primary", use_container_width=True):
                result["localized"] = edited_translation
                episode["status"] = "번역 저장됨"
                episode["updated_at"] = datetime.now().strftime("%Y-%m-%d")
                st.success("번역본이 저장되었습니다.")
                st.rerun()

        with tab_review:
            review_summary = result.get("review_summary", "").strip()
            if review_summary:
                st.markdown(
                    "<div class='review-summary-box'>"
                    + review_summary.replace("\\n", "\n").replace("\n", "<br>")
                    + "</div>",
                    unsafe_allow_html=True,
                )
            else:
                st.info("검수 요약이 아직 생성되지 않았습니다.")


def page_visuals():
    render_breadcrumb()
    st.markdown('<div class="section-title">이미지/관계도</div>', unsafe_allow_html=True)
    st.caption("캐릭터 설정과 인물 관계를 바탕으로 시각 자료를 만들어 보세요.")

    work_labels = {w["title"]: w["id"] for w in st.session_state["works"]}
    if not work_labels:
        st.info("등록된 작품이 없습니다.")
        return

    selected_title = st.selectbox("작품 선택", list(work_labels.keys()))
    st.session_state["selected_work_id"] = work_labels[selected_title]
    work = get_work()

    tab1, tab2 = st.tabs(["캐릭터 이미지 생성", "관계도 생성"])

    with tab1:
        st.markdown("### 캐릭터 이미지 생성")
        st.caption("캐릭터의 성격, 직업, 외형 특징을 바탕으로 이미지를 생성합니다.")

        selected_name = st.selectbox("이미지 생성 대상 캐릭터", list(DUMMY_CHARACTER_PROFILES.keys()))
        profile = DUMMY_CHARACTER_PROFILES[selected_name]

        left, right = st.columns([0.95, 1.05], gap="large")

        with left:
            with st.container(border=True):
                st.markdown(f"#### {profile['name']}")

                personality = st.text_area(
                    "성격",
                    value=profile["personality"],
                    height=90,
                    key=f"img_personality_{selected_name}",
                )

                job = st.text_input(
                    "직업",
                    value=profile["job"],
                    key=f"img_job_{selected_name}",
                )

                appearance_features = st.text_area(
                    "외형 특징",
                    value=profile["appearance_features"],
                    height=110,
                    key=f"img_appearance_{selected_name}",
                )

                extra_prompt = st.text_area(
                    "추가 요청 문구",
                    value="근대 도시 배경의 비극적인 문학 작품 표지 분위기",
                    max_chars=500,
                    height=100,
                    key=f"img_extra_prompt_{selected_name}",
                )
                st.caption(f"{len(extra_prompt):,} / 500자 · 예상 소모 1,200 C")

                if st.button("이미지 생성", type="primary", use_container_width=True):
                    if not personality.strip() or not job.strip() or not appearance_features.strip():
                        st.error("성격, 직업, 외형 특징은 모두 입력해 주세요.")
                    elif not spend_credit(1200, "캐릭터 이미지 생성"):
                        st.error("크레딧이 부족합니다.")
                    else:
                        try:
                            prompt = build_character_image_prompt(
                                work_title=work["title"],
                                character_name=profile["name"],
                                personality=personality,
                                job=job,
                                appearance_features=appearance_features,
                                extra_prompt=extra_prompt,
                            )
                            with st.spinner("캐릭터 이미지를 생성 중입니다..."):
                                image_result = generate_openai_image(prompt)
                            st.session_state["generated_character_images"][(work["id"], selected_name)] = image_result
                            st.success("캐릭터 이미지가 생성되었습니다.")
                        except Exception as exc:
                            st.error(f"이미지 생성 중 문제가 발생했습니다: {exc}")

        with right:
            st.markdown("#### 생성 결과")
            image_result = st.session_state["generated_character_images"].get((work["id"], selected_name))
            render_generated_image(image_result, caption="캐릭터 이미지 생성 결과")

    with tab2:
        st.markdown("### 관계도 생성")
        st.caption("인물 간 관계를 한눈에 볼 수 있는 관계도를 생성합니다.")

        left, right = st.columns([0.95, 1.05], gap="large")

        with left:
            with st.container(border=True):
                st.markdown(f"#### {DUMMY_RELATION_MAP['work_title']} 관계 데이터")

                st.dataframe(
                    DUMMY_RELATION_MAP["relations"],
                    use_container_width=True,
                    hide_index=True,
                )

                relation_extra_prompt = st.text_area(
                    "관계도 추가 요청 문구",
                    value="발표 자료에 넣기 좋은 깔끔한 가족 관계도",
                    max_chars=500,
                    height=110,
                )
                st.caption(f"{len(relation_extra_prompt):,} / 500자 · 예상 소모 1,000 C")

                if st.button("관계도 생성", type="primary", use_container_width=True):
                    if not spend_credit(1000, "캐릭터 관계도 생성"):
                        st.error("크레딧이 부족합니다.")
                    else:
                        try:
                            prompt = build_relation_map_prompt(
                                work_title=work["title"],
                                relation_data=DUMMY_RELATION_MAP,
                                extra_prompt=relation_extra_prompt,
                            )
                            with st.spinner("관계도 이미지를 생성 중입니다..."):
                                image_result = generate_openai_image(prompt)
                            st.session_state["generated_relation_maps"][work["id"]] = image_result
                            st.success("관계도 이미지가 생성되었습니다.")
                        except Exception as exc:
                            st.error(f"관계도 생성 중 문제가 발생했습니다: {exc}")

        with right:
            st.markdown("#### 생성 결과")
            image_result = st.session_state["generated_relation_maps"].get(work["id"])
            render_generated_image(image_result, caption="관계도 이미지 생성 결과")



def render_static_us_romance_guide() -> None:
    guide_path = (
        Path(__file__).resolve().parent
        / "data"
        / "localization_guide"
        / "raw"
        / "us_webnovel_localization_guide_goal.html"
    )

    if not guide_path.exists():
        st.error(f"현지화 가이드 HTML 파일을 찾을 수 없습니다: {guide_path}")
        return

    html = guide_path.read_text(encoding="utf-8")
    components.html(html, height=2450, scrolling=True)


def page_guide():
    render_breadcrumb()
    st.markdown('<div class="section-title">현지화 가이드</div>', unsafe_allow_html=True)
    st.caption("작품을 내보낼 국가와 장르를 선택하면, 현지 독자에게 맞춘 방향을 정리해드립니다.")

    c1, c2, c3 = st.columns([1, 1, 1])
    target = c1.selectbox("진출 희망 국가", TARGET_COUNTRIES, key="guide_target_country")
    genre = c2.selectbox("작품 장르", GENRES, key="guide_genre")
    c3.metric("예상 소모 크레딧", "600 C")

    if st.button("가이드 생성", type="primary", use_container_width=True):
        st.session_state.pop("guide_result", None)
        st.session_state.pop("static_us_romance_guide_ready", None)

        if target != "미국" or genre != "현대 로맨스":
            st.info("현재 데모에서는 미국 · 현대 로맨스 기준 리포트만 제공합니다.")
        elif not spend_credit(600, "현지화 가이드 리포트"):
            st.error("크레딧이 부족합니다.")
        else:
            with st.spinner("현지화 가이드를 생성 중입니다..."):
                time.sleep(10)
            st.session_state["static_us_romance_guide_ready"] = True
            st.toast("현지화 가이드가 생성되었습니다.")

    if st.button("가이드 결과 초기화", use_container_width=True):
        st.session_state.pop("guide_result", None)
        st.session_state.pop("static_us_romance_guide_ready", None)
        st.rerun()

    st.divider()

    if st.session_state.get("static_us_romance_guide_ready"):
        render_static_us_romance_guide()


def page_credit():
    render_breadcrumb()

    st.markdown('<div class="section-title">크레딧 충전</div>', unsafe_allow_html=True)
    st.markdown(
        '<div class="section-sub">필요한 작업량에 맞춰 크레딧을 충전하고, 번역과 이미지 생성에 바로 사용할 수 있습니다.</div>',
        unsafe_allow_html=True,
    )

    left, right = st.columns([1.18, 0.82], gap="large")

    with left:
        top_left, top_right = st.columns([0.6, 0.4], vertical_alignment="bottom")
        with top_left:
            st.markdown("### 충전 상품")
        with top_right:
            selected_plan = st.selectbox(
                "상품 선택",
                options=list(CREDIT_PLANS.keys()),
                format_func=lambda x: x,
            )

        for name, plan in CREDIT_PLANS.items():
            with st.container(border=True):
                c1, c2, c3 = st.columns([1.45, 0.62, 0.55], vertical_alignment="center")

                with c1:
                    st.markdown(f"### {name}")
                    st.caption(plan["desc"])
                    if name == selected_plan:
                        st.success("선택된 상품")
                    else:
                        st.caption("선택 가능")

                with c2:
                    st.markdown('<div class="credit-label">충전 크레딧</div>', unsafe_allow_html=True)
                    st.markdown(f'<div class="credit-value">{plan["credit"]:,} C</div>', unsafe_allow_html=True)

                with c3:
                    st.markdown('<div class="credit-label">결제 금액</div>', unsafe_allow_html=True)
                    st.markdown(f'<div class="credit-value">{plan["price"]:,}원</div>', unsafe_allow_html=True)

    with right:
        plan = CREDIT_PLANS[selected_plan]

        with st.container(border=True):
            st.markdown("### 결제 요약")
            st.caption("선택한 상품의 충전 내역을 확인해 주세요.")

            summary_rows = [
                ("상품명", selected_plan),
                ("충전 크레딧", f"{plan['credit']:,} C"),
                ("현재 보유 크레딧", f"{st.session_state['user']['credit']:,} C"),
                ("충전 후 크레딧", f"{st.session_state['user']['credit'] + plan['credit']:,} C"),
            ]

            for label, value in summary_rows:
                row_l, row_v = st.columns([0.42, 0.58])
                with row_l:
                    st.caption(label)
                with row_v:
                    st.markdown(
                        f"<div style='font-weight:800; color:#2D2440; text-align:right; white-space:nowrap;'>{value}</div>",
                        unsafe_allow_html=True,
                    )

            st.markdown(
                f"""
                <div class="price-highlight" style="margin-top:18px; margin-bottom:24px;">
                    <div class="label">최종 결제 금액</div>
                    <div class="value">{plan['price']:,}원</div>
                </div>
                """,
                unsafe_allow_html=True,
            )

            if not TOSS_CLIENT_KEY:
                st.error("결제 설정을 확인해 주세요.")
            else:
                checkout_url = build_checkout_url(selected_plan, plan)
                st.markdown(
                    f"""
                    <a href="{checkout_url}" target="_blank" class="pay-button">
                        결제하기
                    </a>
                    """,
                    unsafe_allow_html=True,
                )

    st.divider()

    st.markdown("### 크레딧 내역")
    st.dataframe(st.session_state["credit_history"], use_container_width=True, hide_index=True)


render_sidebar()

if handle_payment_result_from_toss():
    st.stop()

view = st.session_state["view"]

if view == "works":
    page_works()
elif view == "work_form":
    page_work_form()
elif view == "work_edit":
    page_work_edit()
elif view == "work_detail":
    page_work_detail()
elif view == "episode_form":
    page_episode_form()
elif view == "episode_translate":
    page_episode_translate()
elif view == "episode_view":
    page_episode_view()
elif view == "visuals":
    page_visuals()
elif view == "guide":
    page_guide()
elif view == "credit":
    page_credit()
else:
    page_works()