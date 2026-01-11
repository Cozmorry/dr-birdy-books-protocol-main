# Creating a 32x32 SVG Logo for BaseScan

## Requirements

- **Format**: SVG (Scalable Vector Graphics)
- **Size**: 32x32 pixels
- **File**: `logo32x32.svg`

## Design Guidelines

1. **Simple Design**: Logo should be recognizable at 32x32 pixels
2. **High Contrast**: Ensure visibility on light and dark backgrounds
3. **Brand Identity**: Should represent Dr. Birdy Books Protocol
4. **Scalable**: SVG format ensures it scales without quality loss

## Options

### Option 1: Use Existing Logo Assets
If you have a logo design, convert it to 32x32 SVG:

```bash
# If you have a PNG logo, you can:
# 1. Resize to 32x32 using image editor
# 2. Convert to SVG using online tools or Inkscape
```

### Option 2: Create Simple SVG
Create a simple SVG with bird/book theme:

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
  <!-- Simple bird silhouette -->
  <circle cx="16" cy="12" r="8" fill="#2563eb"/>
  <ellipse cx="20" cy="10" rx="3" ry="2" fill="#ffffff"/>
  <path d="M 8 16 Q 4 20 8 24" stroke="#2563eb" stroke-width="2" fill="none"/>
  <!-- Book representation -->
  <rect x="6" y="20" width="12" height="8" fill="#1e40af" opacity="0.7"/>
  <line x1="12" y1="20" x2="12" y2="28" stroke="#ffffff" stroke-width="1"/>
</svg>
```

### Option 3: Use Online Tools
- **Inkscape**: Free SVG editor
- **Figma**: Design tool with SVG export
- **Canva**: Online design tool
- **SVG converters**: Online PNG to SVG converters

## Quick SVG Template

Save this as `logo32x32.svg`:

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
  <!-- Background circle -->
  <circle cx="16" cy="16" r="15" fill="#2563eb"/>
  
  <!-- Bird icon (simplified) -->
  <path d="M 10 12 Q 8 10 10 8 Q 12 6 14 8 Q 16 6 18 8 Q 20 6 22 8 Q 24 10 22 12 Q 20 14 18 12 Q 16 14 14 12 Q 12 14 10 12 Z" fill="#ffffff"/>
  
  <!-- Book icon -->
  <rect x="8" y="18" width="16" height="10" fill="#1e40af" rx="1"/>
  <line x1="16" y1="18" x2="16" y2="28" stroke="#ffffff" stroke-width="1"/>
</svg>
```

## Testing

After creating the logo:

1. **Open in browser** to verify it displays correctly
2. **Check size** - should be 32x32 pixels
3. **Test on light/dark backgrounds**
4. **Verify SVG is valid** using online SVG validators

## File Location

Save the logo as:
- `logo32x32.svg` in project root (for BaseScan submission)
- Also consider adding to `frontend/public/` for website use

---

**Note**: This is a template. Customize the design to match your brand identity.

