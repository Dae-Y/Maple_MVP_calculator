# CSS Structure

* **base.css**
  * fonts, reset, body, global base styles
* **layout.css**
  * hero, main containers, grids, footer, major page layout
* **components.css**
  * shared UI components such as tool menu, support menu, common buttons, pills, cards, reusable controls
* **mvp-calculator.css**
  * MVP calculator page-specific styles
* **cube-simulator.css**
  * Cube simulator page-specific styles
* **hunting-timer.css**
  * Hunting timer, install timers, checklist, Pomodoro page-specific styles
* **info-pages.css**
  * About, contact, privacy, updates page-specific styles
* **styles.css**
  * legacy fallback/importer only
  * current HTML pages should not use it directly

## Recommended load order:
1. `base.css`
2. `layout.css`
3. `components.css`
4. page-specific CSS file

### Example usage:

**Main page (`index.html`):**
```html
<link rel="stylesheet" href="css/base.css" />
<link rel="stylesheet" href="css/layout.css" />
<link rel="stylesheet" href="css/components.css" />
```

**Hunting timer page (`hunting-timer.html`):**
```html
<link rel="stylesheet" href="css/base.css" />
<link rel="stylesheet" href="css/layout.css" />
<link rel="stylesheet" href="css/components.css" />
<link rel="stylesheet" href="css/hunting-timer.css" />
```
