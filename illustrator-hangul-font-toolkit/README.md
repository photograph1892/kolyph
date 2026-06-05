# Illustrator Hangul Font Toolkit

한글 서체 제작 중 Illustrator 벡터를 빠르게 가져오고, 부리/획 조각을 반복 배치하며, 글리프별 SVG를 확인하기 위한 실험용 도구 모음입니다.

## 주요 파일

- `tools/hangul-glyphs-lab.html`
  - Glyphs 스타일의 HTML 편집기입니다.
  - Illustrator에서 복사한 SVG 또는 내보낸 SVG 파일을 글리프에 추가합니다.
  - 실제 SVG path 데이터를 유지하며 path `d` 값, 앵커, 베지어 핸들을 표시하고 일부 직접 편집할 수 있습니다.
  - 여러 요소 선택, 그룹화, 잠금, 삭제, 자/가이드, 글리프별 아트보드 그리드 표시를 지원합니다.
  - 폰트 빌드 JSON을 내보낸 뒤 TTF/OTF/WOFF/WOFF2 빌드 스크립트로 연결할 수 있습니다.
- `tools/beak-transfer-lab.html`
  - 기준 부리 SVG 조각을 대상 모음 위에 맞춰보고 결과 SVG를 만드는 실험 도구입니다.
- `scripts/*.jsx`
  - Illustrator에서 가이드 생성, 아트보드 생성, SVG 내보내기, 선택 조각을 Symbol/컴포넌트처럼 배치하는 보조 스크립트입니다.
- `tools/build_font.py`
  - `hangul-glyphs-lab.html`에서 내보낸 폰트 빌드 JSON을 TTF/OTF/WOFF/WOFF2 파일로 변환합니다.
- `assets/hangul-proof-strings.txt`
  - 글리프 균형과 조합 확인용 문자열입니다.

## `hangul-glyphs-lab.html` 사용법

1. 브라우저에서 `tools/hangul-glyphs-lab.html`을 엽니다.
2. 왼쪽 글리프 목록에서 작업할 글자를 선택하거나 `추가`로 새 글리프를 만듭니다.
   - 글리프들은 작업장 안에서 4열 아트보드 그리드로 나란히 배치됩니다.
3. Illustrator에서 SVG로 복사되면 Windows에서는 `Ctrl+V`, macOS에서는 `Cmd+V`로 붙여넣습니다.
   - 클립보드가 SVG를 주지 않으면 Illustrator에서 `scripts/hangul_export_selection_svg.jsx`로 선택 항목을 SVG 파일로 내보낸 뒤 가져오세요.
4. 요소를 클릭해 선택하고, Shift/드래그/방향키/인스펙터 값으로 위치와 크기를 조정합니다.
5. 빈 캔버스나 캔버스 바깥 작업영역을 클릭하면 선택이 해제됩니다.
6. Windows에서는 `Ctrl+R`, macOS에서는 `Cmd+R`로 자를 켠 뒤 자에서 드래그하면 수치 눈금 기준 가이드가 생깁니다.
   - 생성된 가이드도 선택/다중선택/삭제 대상입니다.
7. 각 아트보드의 빈 영역을 클릭하면 해당 아트보드가 선택되고 해당 글리프가 활성화됩니다.
8. 자에서 꺼낸 가이드는 선 주변을 클릭해 선택하고, 드래그해 다시 원하는 위치로 옮길 수 있습니다.
9. 선택한 아트보드를 드래그하면 다른 아트보드의 행/열에 가까워질 때 자동으로 줄맞춤됩니다.

## 편집 단축키

아래 단축키의 `Ctrl`은 Windows 기준입니다. macOS에서는 같은 자리에 `Cmd`를 사용합니다.

- `Ctrl+Z`: 모든 편집 되돌리기
- `Ctrl+Shift+Z` 또는 `Ctrl+Y`: 다시 실행
- `Delete` 또는 `Backspace`: 선택한 요소/가이드 삭제
- `Shift+클릭`: 선택 추가
- `Ctrl+클릭`: 선택 해제
- `Shift+베지어 핸들 드래그`: 수평/수직/45도 방향으로 핸들 이동 고정
- 베지어 핸들 드래그: 기본은 반대쪽 핸들도 함께 움직이며, `Alt+드래그`는 잡은 핸들만 따로 조정
- 빈 곳 드래그: 영역 안에 걸친 요소 선택
- `Ctrl+G`: 선택 요소 그룹화
- `Ctrl+Shift+G`: 그룹 해제
- `Ctrl+2`: 선택한 개체/가이드/아트보드 위치 잠금
- `Ctrl+Shift+2`: 선택한 개체/가이드/아트보드 위치 잠금 해제
- `Ctrl+R`: 자 켜기/끄기
- `Ctrl+0`: 화면 맞춤
- `Ctrl++`, `Ctrl+-`: 확대/축소
- `Alt+마우스 휠`: 커서 기준 확대/축소. 세밀한 패스 작업을 위해 매우 높은 확대율까지 들어갈 수 있습니다.
- 앵커/핸들 크기: 확대율에 따라 완만하게 커져 고배율에서도 선택하기 쉽습니다.
- `마우스 휠`: 위/아래 이동
- `Ctrl+마우스 휠`: 좌/우 이동

## 프루프 자간 조정

프루프 영역은 현재 글리프의 SVG 윤곽을 `폭` 값에 맞춰 나란히 표시합니다. 프루프에서 글자를 클릭한 뒤 `Shift+←`/`Shift+→`를 누르면 해당 글리프의 폭이 10 단위로 줄거나 늘어납니다. `Alt+Shift+←`/`Alt+Shift+→`는 1 단위로 미세 조정합니다.

이 폭 값은 `폰트 빌드 JSON`의 `width`, `SVG 폰트`의 `horiz-adv-x`, 그리고 `tools/build_font.py`가 만드는 TTF/OTF/WOFF/WOFF2 horizontal metrics에 그대로 반영됩니다.

## 폰트 파일 내보내기

1. `hangul-glyphs-lab.html`의 `폰트 내보내기` 영역에서 패밀리 이름, 스타일, 출력 형식을 선택합니다.
2. 상단의 `SVG 폰트`를 누르면 `<font>`/`<glyph>` 구조의 SVG Font 파일을 바로 저장할 수 있습니다.
3. TTF/OTF/WOFF/WOFF2까지 빌드하려면 `SVG 폰트` 파일 또는 상단의 `폰트 빌드 JSON` 파일을 저장합니다.
4. 최초 1회만 폰트 빌드 의존성을 설치합니다.

```powershell
python -m pip install -r tools/requirements-font-export.txt
```

5. 저장한 SVG Font 또는 JSON을 빌드 스크립트에 넣습니다.

```powershell
python tools/build_font.py HangulGlyphsLab-Regular.svg -o dist-font -f ttf otf woff woff2
python tools/build_font.py HangulGlyphsLab-font-package.json -o dist-font -f ttf otf woff woff2
```

`SVG 폰트` 내보내기는 현재 작업 중인 글리프의 path 데이터를 폰트 좌표계로 뒤집어 각 `<glyph d="...">`에 넣습니다. 외부 변환 도구에 넘길 수도 있고, `tools/build_font.py`에 바로 넣어 TTF/OTF/WOFF/WOFF2로 빌드할 수도 있습니다. 편집 상태 전체를 보존하는 용도는 `프로젝트 JSON`이 더 안전합니다.

현재 빌드 스크립트와 SVG Font 내보내기는 SVG `path` 데이터를 폰트 outline으로 변환합니다. `rect`, `circle` 같은 비-path 도형이나 복잡한 중첩 transform은 Illustrator 또는 HTML 편집기에서 path로 확장한 뒤 내보내는 흐름을 권장합니다.

## 현재 한계

이 도구는 폰트 제작 프로그램을 대체하는 완성형 편집기가 아니라, Illustrator 작업 전후의 반복 배치와 SVG 확인을 줄이기 위한 중간 편집기입니다. Boolean 합집합/패스 정리는 최종적으로 Illustrator의 Pathfinder, Shape Builder 또는 전용 폰트 편집기에서 마무리하는 흐름을 권장합니다.
