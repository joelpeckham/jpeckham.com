# Personal website for Joel Peckham
Live at [jpeckham.com](https://jpeckham.com/)

# How to use & modify

## Download and install:
Open a terminal where you want to download and install the code. Then run the following commands.

```git clone https://github.com/joelpeckham/jpeckham.com.git```

```cd jpeckham.com```

```npm install```

## Modify content:
### Pages
Content can be modified by editing the XML files in the `/pages` directory. `index.xml` is the home page and is required. All other pages are optional.
### Theme
Modify the `theme.css` file in the `/rootFiles` directory.
### Components
Components are stored in `/src/components`. Components are used to parse the XML content files into HTML and JS. Each tag in the content XML files is parsed by the component JS file with the same name.


## Build and deploy:
Run the following command to build.

```npm run build``` 

The build results are placed in the `/build` directory. The contents of the `/build` directory can then be copied into your web server's site location.

## Start development server:
I have included a simple development server that watches the `/pages` and `/rootFiles` directories and automatically rebuilds when those files change.

To start the development server run:
`npm run start`
Then navigate to `localhost:8080` in your web browser. 

The dev build injects extra code that forces the browser to refresh when changes are detected, so be sure to run  `npm run build` before deploying the build.

