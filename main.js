const { app, ipcMain, BrowserWindow } = require("electron");
const path = require("path");
const createWindow = () => {
  const mainWindow = new BrowserWindow({
    width: 600,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
    },
  });
  mainWindow.loadURL(`file://${__dirname}/index.html`);
  // mainWindow.webContents.openDevTools();
};

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

global.sharedObj = {
  btcPrice: 0,
  btcVolume: 0,
  loopCount: 0,
  tryStop: false,
};

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
ipcMain.handle("setBtcPrice", (event, value) => {
  global.sharedObj.btcPrice = value;

  return global.sharedObj;
});
ipcMain.handle("addBtcVolume", (event, myGlobalVariableValue) => {
  global.sharedObj.btcVolume += myGlobalVariableValue;

  return global.sharedObj;
});
ipcMain.handle("addLoopCount", (event) => {
  global.sharedObj.loopCount += 1;

  return global.sharedObj;
});
ipcMain.handle("tryStop", (event, value) => {
  global.sharedObj.tryStop = value;

  return global.sharedObj;
});
ipcMain.handle("getTryStop", (event) => {
  return global.sharedObj.tryStop;
});
