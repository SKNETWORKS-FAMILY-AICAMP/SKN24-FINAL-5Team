<img width="1122" height="842" alt="아키텍처" src="https://github.com/user-attachments/assets/8bd89601-2d46-4dda-848d-630547ff7c6d" /># w.LiGHTER
> AI 기반 웹소설 현지화 번역 어시스턴트
>
> **Write, Light, Lighter** — 당신의 이야기, 세계의 언어로 빛내다.

# 1. 팀 소개

## 팀명: 이세계출판부

| 고아라 | 김유진 | 권민제 | 이동민 | 진세형 | 최현진 |
|:---:|:---:|:---:|:---:|:---:|:---:|
| <img width="180" height="180" alt="ar" src="https://github.com/user-attachments/assets/5ed48616-a116-4d83-b608-c65069e9c458" /> | <img width="180" height="180" alt="yj" src="https://github.com/user-attachments/assets/8d1c3ced-1672-4fda-aff2-72f70022b269" /> | <img width="180" height="180" alt="mj" src="https://github.com/user-attachments/assets/e72d6377-8f53-440e-ab09-d25d0fbf6a62" /> | <img width="180" height="180" alt="dm" src="https://github.com/user-attachments/assets/2b4d2db9-4b38-4f97-b9ec-0c81805b383e" /> | <img width="180" height="180" alt="sh" src="https://github.com/user-attachments/assets/fb4c15db-101a-4a80-bc11-78a035cd7b4b" /> | <img width="180" height="180" alt="hj" src="https://github.com/user-attachments/assets/24caf068-35c2-4498-9b1e-6272ae8b398d" /> |
| 기획 / 설계 | 프론트 / 인프라 | AI 모델 개발 | 시스템 / DB | AI 모델 개발 | 백엔드 / 인프라 |
| [![Akoh-0909](https://img.shields.io/badge/Akoh--0909-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/Akoh-0909) | [![shortcut-2](https://img.shields.io/badge/shortcut--2-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/shortcut-2) | [![min3802](https://img.shields.io/badge/min3802-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/min3802) | [![LeeDongMin0115](https://img.shields.io/badge/LeeDongMin0115-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/LeeDongMin0115) | [![gugu-eightyone](https://img.shields.io/badge/gugu--eightyone-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/gugu-eightyone) | [![lifeisgoodlg](https://img.shields.io/badge/lifeisgoodlg-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/lifeisgoodlg) |

# 2. 프로젝트 개요

**w.LiGHTER**는 해외 진출을 준비하는 국내 웹소설 작가를 위한 **AI 기반 웹소설 현지화 번역 어시스턴트**입니다.

한국어 원문을 **영어·중국어·일본어·태국어** 4개 언어로 **다국어 번역**하고, 번역 과정에서 문화권 오해·민감 표현을 사전 검수합니다. 나아가 **현지화 가이드, 표지 이미지, 캐릭터 설정집/관계도**까지 창작 워크플로우 전반을 지원합니다.

> 에이전시 없이도, 개인 작가가 직접 글로벌 진출을 할 수 있도록.

# 3. 프로젝트 배경

2024년 국내 웹소설 시장 규모는 약 1조 3,500억 원으로, 2022년(1조 390억 원) 대비 약 30% 성장했습니다(연평균 +13.3%). 웹소설 작가는 약 20만 명, 이용자는 750만 명 이상으로 추산됩니다.

로맨스 판타지 웹소설 <상수리나무 아래>의 영문 단행본이 뉴욕타임즈 베스트셀러 7위에 오르는 등, 한국 웹소설의 글로벌 성과도 가시화되고 있습니다.

웹소설 수출 국가는 중국 40%, 미국 16%, 일본·대만 각 12%로, 이러한 시장 분포와 한국 콘텐츠 수요를 종합해 **중국·미국·일본·태국** 4개국을 1차 타겟으로 선정하였습니다.

> 출처: 문체부·출판진흥원 「2024 웹소설 산업 현황 실태조사」

## 3-1. 문제 정의

개인 웹소설 작가가 해외 진출을 시도할 때, 번역 이후 문제를 발견하면 **원문 수정 → 재번역 → 현지 감수**까지 전 과정을 다시 밟아야 합니다. 전문 번역가 부족, 문화 적응의 어려움, 국가별 규제로 인해 해외 진출 비용과 난이도가 큽니다.

| 문제 | 내용 |
|---|---|
| **높은 비용 부담** | 전문 번역가 1화 기준 10~20만 원, 번역 후 감수·수정 시 재작업 비용 발생, 개인 작가는 정부 번역비 지원 대상에서 제외 |
| **번역 품질 한계** | 고유명사·세계관 용어 일관성 유지 불가, 국가별 민감 표현·금기 코드 대응 부재, 문체 디테일(호칭·존대·어미) 반영 한계 |
| **검수 체계 부재** | 번역 전 원고 품질 검수 도구 전무, 번역 후 네이티브 감수에만 의존, 국가별 콘텐츠 규제 차이 사전 확인 불가 |

## 3-2. 해결 방안

> **"고치는 건 빠를수록 싸다"**

**w.LiGHTER**는 한국어 원문을 **영어·중국어·일본어·태국어**로 **다국어 번역**하고, 번역 과정에서 **문화권 오해·민감 표현을 사전 검수**합니다. 핵심 기능은 세 가지 축으로 구성됩니다.

1. **다국어 번역 및 번역 검수 챗봇** — LLM 기반 다국어 번역 및 번역 전략 리포트 출력, 번역본을 검수하는 챗봇
2. **국가별 현지화 가이드 파이프라인** — 국가별 현지화 적합성 분석 및 문화 유의사항(금기·종교·민감 요소) 추출
3. **국가별 특성을 반영한 창작 어시스턴트** — 표지 이미지 생성, 캐릭터 설정집 추출, 캐릭터 관계도 생성

| 기능 | 설명 |
|---|---|
| **다국어 번역** | 한국어 원문을 영어·중국어·일본어·태국어로 번역. 작품 용어집 기반 설정 일관성 유지, 말투·문체·문화·용어 4종 병렬 검수, 한국 문화 RAG 기반 미주 및 번역 전략 리포트 출력 |
| **검수 챗봇** | 모델 리뷰어 노드 의견을 바탕으로 번역본을 검수하고, 사용자의 질의응답·수정 요청에 대해 번역 제안 제공 |
| **현지화 가이드 생성** | 시놉시스 분석 기반 국가별 현지화 적합성 분석 및 현지 문화권 유의사항을 담은 가이드(HTML) 생성 |
| **표지 이미지 생성** | 작품 정보·시놉시스·타겟 국가 기반, 해외 플랫폼별 표지 트렌드를 반영한 표지 이미지 생성 |
| **캐릭터 설정집 추출** | 시놉시스에서 캐릭터(주연·조연·단역)와 세부 설정을 자동 추출·관리 |
| **캐릭터 관계도 생성** | 추출된 캐릭터 설정집을 기반으로 인물 간 관계도(HTML) 시각화 |

## 3-3. 서비스 포지셔닝
일반 AI 번역기와 전문 번역 에이전시 사이에서,
**w.LiGHTER**는 *"개인 작가가 직접 사용하기 편한, 쉽고 빠른 현지화 지원 서비스"* 라는 독자적 포지션을 점유합니다.

| 비교 항목 | **w.LiGHTER** | Alandal<br>(AI 번역 엔진) | ChatGPT | 일반 기계번역<br>(파파고/구글) | 전문 번역<br>에이전시 |
|:---:|:---:|:---:|:---:|:---:|:---:|
| 대상 | 개인 작가 | B2B<br> | 일반 사용자 | 일반 사용자 | 출판사·CP사 |
| 다국어<br>번역 | ○ | △<br>(수작업으로 QA) | △<br>(수동 프롬프트) | △<br>(번역만 / 현지화 ✕) | ○ |
| 타겟 국가<br>가이드라인 | ○ | △<br>(B2B계약 개별협의) | ✕ | ✕ | ○ |
| 설정 일관성 검증 | ○ | △<br>(용어집 설정 한정) | △<br>(수동 프롬프트) | ✕ | △<br>(전문가 의존) |
| 웹소설 장르 특화 | ○<br>(타겟국가 특화) | ○ | ✕ | ✕ | △<br>(전문가 의존) |
| 문화권 리스크 탐지<br>및 문화 검수 | ○ | △<br>(수작업으로 QA) | ✕ | ✕ | △<br>(전문가 의존) |
| 개인 작가 접근성 | ○ | ✕<br>(B2B) | △<br>(프롬프트 학습 /<br>설계 필요) | ○ | △<br>(고비용) |
| 단가 | 크레딧<br>(저비용) | 높음<br>(B2B견적) | 무료/저가 | 무료/저가 | 고가 |
| 통합 Pipeline 제공<br>(작가 워크플로우) | ○ | ○ | ✕ | ✕ | △<br>(수작업 통합) |

> ○ 완전 지원 / △ 부분 지원 또는 우회 가능 / ✕ 미지원

## 3-4. 기대 효과
**작가 관점**
- 현지화 비용 절감
- 국가별 언어 번역 처리 소요 시간 감소
- 번역 후 재작업(수정·보완) 발생률 감소
- 글로벌 진입 장벽 해소
- 번역·현지화 등 기타 업무에서 벗어나 창작 집중도 향상
- 캐릭터·호칭·세계관 용어의 회차·언어 간 일관성 확보

## 3-5. 비즈니스 모델
사용량 기반의 **크레딧 충전형 단계별 요금제**로 유저 진입 장벽을 낮추고 객단가를 극대화합니다. 신규 가입 시 1화 분량(1,000C)의 번역을 체험할 수 있는 **무료 크레딧**을 제공합니다.

| 플랜 | 가격 | 지급 크레딧 | 권장 번역량 | 비고 |
|:---:|:---:|:---:|:---:|:---:|
| **Free** | 무료 | 1,000C | 약 1화 | 신규 가입 체험 |
| **Basic** | ₩9,900 | 10,000C | 약 10화 | — |
| **Plus** | ₩29,900 | 35,000C | 약 35화 | 14% 할인 |
| **Max** | ₩49,900 | 75,000C | 약 75화 | 33% 할인 |

> *1화 기준: 공백 포함 5,000자

# 4. 데이터 출처
| 분류 | 출처 |
|---|---|
| 콘텐츠 가이드라인·규제 | 일본 웹소설 플랫폼 小説家になろう |
| 국가별 문화 코드 | 한국콘텐츠진흥원 WelCon |
| 한국 문화 데이터 | 서강대학교 ISDS K-Culture-Desc |

수집한 K-Culture 데이터는 **번역 RAG용 JSON 구조로 변환 → LLM 기반 문서 보강 → 품질 검토·정제** 과정을 거쳐 문화 참조 데이터로 구축했습니다.

# 5. 기술 스택
| 분류 | 기술/도구 |
|---|---|
| Frontend | ![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white) ![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white) ![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black) |
| Backend | ![Django](https://img.shields.io/badge/Django-092E20?style=for-the-badge&logo=django&logoColor=white) ![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white) |
| AI / Agent | ![OpenAI](https://img.shields.io/badge/OpenAI-412991?style=for-the-badge&logo=openai&logoColor=white) ![LangGraph](https://img.shields.io/badge/LangGraph-1C3C3C?style=for-the-badge&logo=langgraph&logoColor=white) |
| Database | ![Amazon RDS](https://img.shields.io/badge/Amazon%20RDS-527FFF?style=for-the-badge&logo=amazonrds&logoColor=white) ![MySQL](https://img.shields.io/badge/MySQL-4479A1?style=for-the-badge&logo=mysql&logoColor=white) ![Qdrant](https://img.shields.io/badge/Qdrant%20(Vector%20DB)-DC244C?style=for-the-badge&logo=qdrant&logoColor=white) |
| Infrastructure | ![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white) ![Amazon EC2](https://img.shields.io/badge/Amazon%20EC2-FF9900?style=for-the-badge&logo=amazonec2&logoColor=white) |
| Storage | ![Amazon S3](https://img.shields.io/badge/Amazon%20S3-569A31?style=for-the-badge&logo=amazons3&logoColor=white) |
| API | ![Tavily](https://img.shields.io/badge/Tavily-3F76E4?style=for-the-badge&logoColor=white) |

### 사용 모델

| 분류 | 모델 |
|---|---|
| Embedding | ![nlpai-lab/KURE-v1](https://img.shields.io/badge/nlpai--lab%2FKURE--v1-FFD21E?style=for-the-badge&logo=huggingface&logoColor=black) |
| LLM | ![GPT-5.4-mini](https://img.shields.io/badge/GPT--5.4--mini-412991?style=for-the-badge&logo=openai&logoColor=white) ![GPT-5.4-nano](https://img.shields.io/badge/GPT--5.4--nano-412991?style=for-the-badge&logo=openai&logoColor=white) |
| Image Generation | ![GPT-image-2](https://img.shields.io/badge/GPT--image--2-412991?style=for-the-badge&logo=openai&logoColor=white) |

> **모델 선정 노트**
> - **Embedding** — Input(한국어)–Output(한국어) 구조가 더 효과적인 성능을 보여, 다국어 임베딩(multilingual-e5-large) 대신 한국어 특화 모델 `nlpai-lab/KURE-v1`을 채택 (Hit@1 0.82 / Hit@3·5 0.92 / MRR 0.867).
> - **LLM** — 추론 토큰 기반 문제 해결 능력과 출력량(128K)에서 우위를 보인 `GPT-5.4-mini`를 채택 (기존 GPT-4.1-mini 대비 장르 문체 재현·콘텐츠 처리 안정성 개선).
> - **Image** — 동일 프롬프트 기준 품질·가격 우위로 `GPT-image-2` 채택.

# 6. 시스템 아키텍처

<img width="1122" height="842" alt="아키텍처" src="https://github.com/user-attachments/assets/7a0b0141-b9f5-4ba0-9a8d-9c5b62420afa" />

### 번역 파이프라인

<img width="3480" height="2300" alt="번역_파이프라인_구조도" src="https://github.com/user-attachments/assets/d93f8cac-fdab-42cd-be38-1e0f0db8c78b" />

번역 요청 → **작품 용어집 조회**(설정 일관성) → 초벌 번역 → **검수 4종 병렬**(말투·문체·문화·용어) → 검수 취합 → 최종 번역 → **한글 잔류 점검·수리**(최대 2회) → **한국 문화 미주**(한국 문화 RAG / Qdrant) → 결과 패키징 → 응답(최종 번역 + 리포트)

# 7. 향후 계획
단계별 성장 전략을 통해 **다국어 웹소설 플랫폼**으로 확장해 나갑니다.

| 단계 | 목표 | 내용 |
|:---:|:---:|---|
| **단기** | 현지화 가이드 고도화 | 사용자 니즈에 맞는 현지화 가이드 기능 고도화 및 제공 항목 다양화 |
| **중기** | 지원 언어 다양화 | 현재 4개 언어 지원에서 나아가 다국어 번역을 지원하는 서비스로 확장 |
| **장기** | 다국어 웹소설 플랫폼 | 개인 작가(1차) → 출판사·CP사(2차) → 다국어 웹소설 플랫폼(최종) |

추가 개선 방향: 대용량 첨부 기능(완결작·비축분, 최대 5개 파일), 해외 연재 플랫폼 추천(장르·연령층·성비 등), 원문 내 서사 타임라인 기능.
