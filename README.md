# Portfolio

GitHub Pages에서 제공하는 단일 페이지 포트폴리오입니다. HTML·CSS·JavaScript로 구성하며 별도 패키지 설치나 빌드가 필요하지 않습니다.

## 파일 구조

```text
src/home/
  index.html       # 소개, Opening, Works, Education, Skills, 마무리
  styles.css       # 화면과 반응형 스타일
  interaction.js   # Canvas 빛 렌더링과 스크롤 연동
  papers.js        # Works 아래 두 종이의 바람에 날리는 등장
app/
  README.md        # 향후 백엔드 코드용 공간
tests/             # 인터랙션 검사
.github/workflows/pages.yml
```

페이지가 추가되면 `src/페이지명/` 아래에 해당 화면의 파일을 함께 둡니다. 현재 배포 대상은 `src/home/`입니다.

## 로컬에서 보기

저장소 루트에서 실행한 뒤 <http://localhost:4173>에 접속합니다.

```powershell
py -3 -m http.server 4173 --directory src/home
```

인터랙션 검사는 Node.js 22 이상에서 실행합니다.

```powershell
node --test tests/*.test.mjs
```

## GitHub Pages 배포

1. 저장소의 **Settings → Pages → Build and deployment → Source**를 **GitHub Actions**로 설정합니다.
2. 변경 내용을 검토하고 `main`에 푸시하면 **Deploy GitHub Pages** 워크플로가 검사를 실행한 뒤 `src/home/`을 배포합니다. **Actions → Deploy GitHub Pages → Run workflow**로 수동 실행할 수도 있습니다.
3. 배포 성공 후 예상 주소는 <https://joon080.github.io/portfolio/>입니다. 실제 주소와 성공 여부는 Actions 실행 결과 및 Pages 설정에서 확인합니다.

위 설정은 사용자가 GitHub에서 수행해야 하며, 로컬 파일 생성만으로 원격 설정이나 배포가 완료되지는 않습니다.

배포 구성은 [GitHub Pages 공식 워크플로 안내](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)를 따릅니다. 다른 배포 서비스는 사용하지 않습니다.

## 내용 교체

이름·연락처·프로젝트 제목과 설명·학력·기술 수치는 시안용 임시 내용입니다. `src/home/index.html`에서 직접 교체할 수 있습니다. 색상·간격·글꼴·이름 페이드인은 `styles.css`, Opening의 빛과 스크롤 동작은 `interaction.js`에서 수정합니다. 빛은 Canvas 2D의 면 채우기·그라데이션·블러로 직접 그리며 이미지 파일을 사용하지 않습니다.

GitHub Pages는 정적 파일을 제공하므로 `app/`의 서버 코드나 API를 실행하지 않습니다. 현재 포트폴리오의 인터랙션은 브라우저 안에서 동작합니다.

Works 아래 두 종이는 스크롤 진행률에 맞춰 들어오며, 위로 스크롤하면 같은 경로를 거꾸로 따라 나갑니다.
