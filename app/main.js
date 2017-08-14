// Handle Squirrel events for Windows immediately on start
if(require('electron-squirrel-startup')) return;

const electron        = require('electron');
const {app, BrowserWindow, ipcMain, Tray, nativeImage, autoUpdater} = require('electron')
const path            = require('path')
const os              = require('os');
const appVersion      = require('./package.json').version;
const logger          = require('winston');
logger.level          = 'debug';
global.logger         = logger;

// Keep reference of main window because of GC
var mainWindow = null;

var updateFeed    = 'http://localhost:3000/updates/latest';
var isDevelopment = process.env.NODE_ENV === 'development';
var feedURL       = "";

// Don't use auto-updater if we are in development
if (!isDevelopment) {
    if (os.platform() === 'darwin') {
        updateFeed = 'https://floating-citadel-39419.herokuapp.com/updates/latest';
    }
    else if (os.platform() === 'win32') {
        updateFeed = 'http://eatodo.s3.amazonaws.com/updates/latest/win' + (os.arch() === 'x64' ? '64' : '32');
    }

    autoUpdater.addListener("update-available", function(event) {
        logger.debug("A new update is available");
        if (mainWindow) {
            mainWindow.webContents.send('update-message', 'update-available');
        }
    });
    autoUpdater.addListener("update-downloaded", function(event, releaseNotes, releaseName, releaseDate, updateURL) {
        logger.debug("A new update is ready to install", `Version ${releaseName} is downloaded and will be automatically installed on Quit`);
        if (mainWindow) {
            mainWindow.webContents.send('update-message', 'update-downloaded');
        }
    });
    autoUpdater.addListener("error", function(error) {
        logger.error(error);
        if (mainWindow) {
            mainWindow.webContents.send('update-message', 'update-error');
        }
    });
    autoUpdater.addListener("checking-for-update", function(event) {
        logger.debug("Checking for update");
        if (mainWindow) {
            mainWindow.webContents.send('update-message', 'checking-for-update');
        }
    });
    autoUpdater.addListener("update-not-available", function() {
        logger.debug("Update not available");
        if (mainWindow) {
            mainWindow.webContents.send('update-message', 'update-not-available');
        }
    });

    const feedURL = updateFeed + '?v=' + appVersion;
    autoUpdater.setFeedURL(feedURL);
}


let tray = undefined
let window = undefined

// This method is called once Electron is ready to run our code
// It is effectively the main method of our Electron app
app.on('ready', () => {
  // Setup the menubar with an icon
  let icon = nativeImage.createFromDataURL(base64Icon)
  tray = new Tray(icon)

  // Add a click handler so that when the user clicks on the menubar icon, it shows
  // our popup window
  tray.on('click', function(event) {
    toggleWindow()

    // Show devtools when command clicked
    if (window.isVisible() && process.defaultApp && event.metaKey) {
      window.openDevTools({mode: 'detach'})
    }
  })

  // Make the popup window for the menubar
  window = new BrowserWindow({
    width: 300,
    height: 200,
    show: false,
    frame: false,
    resizable: true,
    icon: path.join(__dirname, 'assets/icons/png/64x64.png')
  })

  // Tell the popup window to load our index.html file
  window.loadURL(`file://${path.join(__dirname, 'index.html')}`)

  // Only close the window on blur if dev tools isn't opened
  window.on('blur', () => {
    if(!window.webContents.isDevToolsOpened()) {
      window.hide()
    }
  })
})

const toggleWindow = () => {
  if (window.isVisible()) {
    window.hide()
  } else {
    showWindow()
  }
}

const showWindow = () => {
  const trayPos = tray.getBounds()
  const windowPos = window.getBounds()
  let x, y = 0
  if (process.platform == 'darwin') {
    x = Math.round(trayPos.x + (trayPos.width / 2) - (windowPos.width / 2))
    y = Math.round(trayPos.y + trayPos.height)
  } else {
    x = Math.round(trayPos.x + (trayPos.width / 2) - (windowPos.width / 2))
    y = Math.round(trayPos.y + trayPos.height * 10)
  }


  window.setPosition(x, y, false)
  window.show()
  window.focus()
}

ipcMain.on('show-window', () => {
  showWindow()
})

app.on('window-all-closed', () => {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// Tray Icon as Base64 so tutorial has less overhead
let base64Icon = `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAQAAABKfvVzAAAABGdBTUEAALGPC/xhBQAAACBjSFJNAAB6JgAAgIQAAPoAAACA6AAAdTAAAOpgAAA6mAAAF3CculE8AAAAAmJLR0QA/4ePzL8AAAAHdElNRQfhBxENCA5s8LoxAAABrklEQVQ4y7XTv0uVYRQH8M/7vLcItEVIJAqnfgzdEAwE8RfoLduVaGjpL0jIzWiQoCFwaW02yDHIugb+CBcTxJs4hhDU5FJG2n3fp+Ha9So0JHie6Tnn++V7Dud7OOlIjiY6jvzX/kWoA4PQUM/lh4nJIXAq1gBrB9kgkR2QknrhL/iCXte14Zt1S740ktYkHTWdIMOQMSWnGlqqemfKHFK5SEAilSmaU3ZLjui3qqqqHcPK5hRlUglpW03uoZcu+eS5r174qSgRpD576qIu9/3yQZCkbdEZ0x7IPXFPyTNlr3S6Ihe12jaooMdt17y2F7SYNWJLyWM3ddvSjHVEqdxd/R4p2TLijZZgXp9lnZZwVb8uP5x3R22+HDewpNOyPvOFQ2vM8VbFZa3ioQXWIxiwqNuqXnxEsx7nxH0PhP1sr1XdFg0E24bNaFc2acG01F7dMplg2oJJZe1mDNsOgl2jxkUTNqzYdHpfPUptWrFhQjRu1K6QdNQWV1U0ZVDuu6aGlnecFbw3pqIgEwOiTKpiSMmsJoWG12RWyZCKVCYex3zHsPcxDuh/TvTk4w/QeJQ5JigWTwAAACV0RVh0ZGF0ZTpjcmVhdGUAMjAxNy0wNy0xN1QxMzowODoxNC0wNDowMH0NRHkAAAAldEVYdGRhdGU6bW9kaWZ5ADIwMTctMDctMTdUMTM6MDg6MTQtMDQ6MDAMUPzFAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAABJRU5ErkJggg==`
