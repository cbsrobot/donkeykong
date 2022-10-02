// Modules to control application life and create native browser window
const { app, globalShortcut, BrowserWindow, ipcMain  } = require('electron')
const path = require('path')

const gpio = require('onoff').Gpio;
const pin17 = new gpio(17, 'in', 'both');

require('electron-reload')(__dirname, {
  electron: path.join(__dirname, 'node_modules', '.bin', 'electron')
});

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow

function createWindow() {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1920,
    height: 1080,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  })

  mainWindow.webContents.on('did-frame-finish-load', (event, input) => {
    pin17.watch((err, value) => {
      try {
        if (value == 1) {
          // ignore value == 0
          mainWindow.webContents.send('gpio', {pin: 17, val: value})
        }
      } catch (error) {
        console.log(error)
      }
    });
  });

  //mainWindow.webContents.openDevTools()
  mainWindow.webContents.on('before-input-event', (event, input) => {
    /*
      if (input.control && input.key.toLowerCase() === 'i') {
        console.log('Pressed Control+I')
        event.preventDefault()
      }
    */

    if (input.key.toLowerCase() === '0') {
      mainWindow.webContents.openDevTools()
      event.preventDefault()
    }

    if (input.key.toLowerCase() === '9') {
      mainWindow.setKiosk(!mainWindow.kiosk)
      event.preventDefault()
    }

    if (input.key === 'Escape') {
      app.quit()
    }
  })

  // and load the index.html of the app.
  mainWindow.loadFile('index.html')

  // Open the DevTools.
  // mainWindow.webContents.openDevTools()

  // Emitted when the window is closed.
  mainWindow.on('closed', function () {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null
  })
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
//app.on('ready', createWindow)

app.whenReady().then(() => {
  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
  
  function enterFullscreen(arg) {
    mainWindow.setKiosk(!mainWindow.kiosk);
  }

  setTimeout(enterFullscreen, 500);

})

// Quit when all windows are closed.
app.on('window-all-closed', function () {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', function () {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) createWindow()
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
