# Medha - Hydrology & Flood Management Research Portfolio

A modern, professional single-page portfolio website showcasing expertise in Civil Engineering, Hydrology, and Sustainable Flood Management research.

## 🌊 About This Website

This portfolio demonstrates a comprehensive overview of professional experience, research projects, and technical skills in hydrology and flood management. The site features a professional water-themed design with smooth navigation and interactive 360° panoramic image viewer.

## 🎯 Key Features

### Single-Page Design
- Smooth scrolling navigation between sections
- Professional, modern interface
- Fully responsive on all devices
- Water-themed color scheme (blues and teals)

### Sections
1. **Hero** - Dynamic introduction with call-to-action buttons
2. **About** - Professional background and key statistics
3. **Skills** - Technical expertise organized by category:
   - 💾 Data Management (ArcGIS, QGIS, Database)
   - 📊 Data Analysis (Python, R, Stata)
   - 💧 Hydrological Expertise (ReFH, WINFAP, Flood Risk)
   - 🌊 Hydraulic Modeling (HEC-RAS, TUFLOW, CityCAT, SWMM)
   - 🔬 Field Work (Sensor Networks, Data Collection)
   - 📊 Documentation (Technical Writing, Reports)

4. **Research** - Featured project with interactive 360° viewer:
   - Project highlights with icons
   - Interactive panoramic field site viewer
   - Additional research focus areas
   
5. **Experience** - Professional timeline with 6 positions:
   - PhD Hydrology (Newcastle University)
   - Hydro-Jules REP (UKCEH)
   - Project Hydrologist (SLR Consulting)
   - Junior Manager (Gram Vikas)
   - Climate Resilience Consultant (IPE Global)
   - Research Fellow (Development Alternatives)

6. **Contact** - Multiple contact methods with social links

### Interactive 360° Panorama Viewer
- **Drag to Pan**: Explore the panoramic image by dragging
- **Mobile Support**: Touch gestures for mobile devices
- **Fullscreen Mode**: Immersive viewing experience
- **Reset View**: Return to default position
- **Smooth Animation**: Professional transitions

## 📁 Project Structure

```
medha1305.github.io/
├── index.html              # Main single-page application
├── styles.css              # Professional responsive styling
├── script.js               # Navigation & panorama viewer
├── panorama-360.jpeg       # Interactive research field site image
└── .git/                   # Version control
```

## 🛠️ Technologies Used

- **HTML5** - Semantic markup structure
- **CSS3** - Modern styling with:
  - Flexbox & Grid layouts
  - CSS animations & transitions
  - Gradient backgrounds
  - Responsive design
- **JavaScript** - Pure vanilla JavaScript:
  - Smooth scroll navigation
  - Panorama viewer with drag/touch support
  - Intersection Observer for animations
  - No external dependencies

## 💻 Features

### Navigation
- Fixed sticky navigation bar
- Active link highlighting
- Smooth anchor link scrolling
- Mobile-responsive hamburger menu
- Updates automatically based on viewport

### Design
- **Color Scheme**: Professional blues and teals (water-themed)
- **Typography**: Clean, modern sans-serif fonts
- **Animations**: Subtle scroll animations and hover effects
- **Responsiveness**: Fully responsive (mobile, tablet, desktop)

### Panorama Viewer
- Real-time interactive exploration
- Boundary detection prevents over-panning
- Touch and mouse support
- Fullscreen capability
- Lightweight implementation (no libraries)

## 🚀 Getting Started

### Local Development
1. Clone the repository
2. Run `python preprocess_panorama.py` to build the prepared panorama into `360_Images/`
 3. Open `index.html` in your web browser
 4. All files are self-contained (no build process needed)

### GitHub Pages
The website is automatically deployed to:
```
https://medha1305.github.io
```

Changes pushed to the main branch are live within minutes.

## 📋 Features Breakdown

### Professional Sections
- **About Stats**: Visual display of key achievements
- **Skills Grid**: Organized by technical category with checkmarks
- **Research Highlights**: Icon-based project information
- **Timeline**: Visual professional experience chronology
- **Contact Cards**: Multiple contact methods with icons

### User Experience
- Smooth page scrolling
- Hover effects on cards and buttons
- Auto-updating navigation on scroll
- Loading animations on page scroll
- Mobile-optimized touch interactions

## 🔧 Customization

### Edit Content
1. Update text directly in `index.html`
2. Modify styling in `styles.css`
3. Update panorama image path in `script.js` (line ~274)

### Colors
Update CSS variables in `styles.css`:
```css
:root {
    --primary: #0066cc;      /* Main blue */
    --secondary: #00a8cc;    /* Teal */
    --accent: #00d9ff;       /* Light cyan */
    --dark: #0a1428;         /* Dark */
    --light: #f8f9fa;        /* Light gray */
}
```

## 📊 Browser Support

- Chrome/Chromium (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## 📱 Responsive Breakpoints

- **Desktop**: 1200px+
- **Tablet**: 768px - 1199px
- **Mobile**: 480px - 767px
- **Small Mobile**: Below 480px

## ⚡ Performance

- Lightweight: No external frameworks
- Fast loading: Optimized assets
- Smooth scrolling: Native CSS
- Efficient panorama viewer: Custom implementation
- Mobile-optimized: Touch events support

## 🎓 Educational Content

This website showcases:
- Academic expertise in hydrology
- Field research capabilities
- Software proficiency
- Project management experience
- Data analysis skills
- Climate adaptation solutions

## 📞 Contact Information

- **Email**: medha2@newcastle.ac.uk
- **LinkedIn**: [medha-hydro](https://www.linkedin.com/in/medha-hydro)
- **GitHub**: [medha1305](https://github.com/medha1305)
- **Institution**: Newcastle University, UK

## 📄 License

This portfolio website and its content are personal professional materials.

---

**Last Updated**: April 24, 2026  
**Status**: ✅ Live & Production Ready  
**Hosting**: GitHub Pages (medha1305.github.io)
# Medha's Portfolio Website

Welcome to my professional portfolio website! This is a responsive, modern website showcasing my research, experience, and professional background in Hydrology and Sustainable Flood Management.

## 🌐 Website Features

### Pages
1. **Home** - Landing page with overview and quick links
2. **About** - Personal profile and skills summary
3. **Research** - Research projects with interactive 360° panoramic image viewer
4. **Experience** - Detailed professional timeline and work history

### Interactive 360° Panorama Viewer
- **Drag to Pan**: Click and drag your mouse to explore the panoramic image
- **Zoom**: Use your mouse scroll wheel to zoom in/out
- **Mobile Support**: Touch gestures for mobile devices
- **Fullscreen Mode**: View the panorama in fullscreen
- **Reset View**: Return to the default view

## 🚀 How to Use

### Local Development
1. Clone or download this repository
2. Open `index.html` in your web browser
3. Navigate through pages using the navigation menu

### GitHub Pages Deployment
Since this is hosted on GitHub Pages (medha1305.github.io), the website is automatically served at:
```
https://medha1305.github.io
```

To deploy changes:
1. Make your edits to the files
2. Commit and push to the main branch
3. GitHub Pages will automatically update within a few minutes

## 📁 Project Structure

```
medha1305.github.io/
├── index.html              # Home page
├── about.html              # About/Profile page
├── research.html           # Research projects with 360° viewer
├── experience.html         # Work experience timeline
├── style.css               # Main stylesheet
├── viewer360.js            # 360° panorama viewer JavaScript
├── panorama-360.jpeg       # Interactive 360° panoramic image
└── README.md               # This file
```

## 🎨 Design Features

- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile devices
- **Modern UI**: Clean, professional interface with gradient accents
- **Smooth Navigation**: Sticky navigation bar for easy access
- **Interactive Elements**: Hover effects, smooth transitions, and animations
- **Professional Colors**: Carefully chosen color scheme for academic/professional context

## 🔧 Technologies Used

- **HTML5** - Semantic markup
- **CSS3** - Modern styling with flexbox and grid
- **JavaScript (Vanilla)** - Interactive 360° viewer without external dependencies
- **Responsive Design** - Mobile-first approach

## 📧 Contact Information

- **Email**: [medha2@newcastle.ac.uk](mailto:medha2@newcastle.ac.uk)
- **LinkedIn**: [medha-hydro](https://www.linkedin.com/in/medha-hydro)
- **GitHub**: [medha1305](https://github.com/medha1305)

## 🎓 About Me

I'm pursuing a PhD in Civil Engineering from Newcastle University with a focus on evaluating and designing sustainable solutions to mitigate floods. My expertise includes:

- Spatial data management (ArcGIS, QGIS)
- Data analysis (Stata, R, Python)
- Hydrometric data collection
- Hydrological and hydraulic modelling
- Flood risk assessment and management

## 📝 License

This website and its content are personal portfolio materials.

---

**Last Updated**: April 24, 2026
