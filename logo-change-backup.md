# Logo change backup (before edit)

## `index.html` — existing header logo markup

```html
<a class="brand brand-image-link" href="#home" aria-label="Unifold home">
  <img class="brand-image" src="everyday-tools-image.jpeg" alt="Unifold — Everything you need. All in one." />
</a>
```

## `styles.css` — existing logo rules

```css
.brand-image-link { width: 124px; height: 76px; flex: none; overflow: hidden; }
.brand-image { display: block; width: 124px; height: 124px; max-width: none; transform: translateY(-24px); }
@media (max-width: 620px) {
  .brand-image-link { width: 108px; height: 66px; }
  .brand-image { width: 108px; height: 108px; transform: translateY(-21px); }
}
```
