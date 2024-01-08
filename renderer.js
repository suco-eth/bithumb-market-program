const { XCoinAPI } = require("./XCoinAPI.js");
const { ipcRenderer } = require("electron");

function getValues() {
  const api_key = document.querySelector("#api-key").value;
  const api_secret = document.querySelector("#api-secret").value;
  const krw_amount = document.querySelector("#krw-amount").value;
  const krw_target_volume = document.querySelector("#krw-target-volume").value;
  const order_currency = document.querySelector("#order-currency").value;
  const payment_currency = "KRW";
  return {
    api_key,
    api_secret,
    krw_amount,

    krw_target_volume,
    order_currency,
    payment_currency,
  };
}
function updateBithumb() {
  const { api_key, api_secret } = getValues();
  bithumb = new XCoinAPI(api_key, api_secret);

  return bithumb;
}

function addBtcVolume(value) {
  ipcRenderer.invoke("addBtcVolume", value).then((res) => {
    const { btcVolume, btcPrice, loopCount } = res;
    const loop = loopCount;
    document.querySelector("#total-btc-volume").innerText = btcVolume.toFixed(4) + "BTC";

    const krwVolume = Math.floor(btcVolume * btcPrice * 10000) / 10000;

    document.querySelector("#total-krw-volume").innerText = numberToKorean(krwVolume) + "원";

    // document.querySelector("#total-loop-count").innerText = loop;
  });
}

async function calculateUnits(bithumb) {
  const { order_currency, payment_currency, krw_amount } = getValues();
  const data = await bithumb.xcoinApiCall("/public/ticker/" + order_currency + "_" + payment_currency);
  const parsed = JSON.parse(data.body);

  const currentPrice = parsed.data.closing_price;

  btcPrice = Number(currentPrice);
  await ipcRenderer.invoke("setBtcPrice", btcPrice);

  const desiredUnits = Math.floor((krw_amount / currentPrice) * 10000) / 10000;
  return desiredUnits.toFixed(4);
}

async function buy(bithumb, params) {
  try {
    await bithumb.xcoinApiCall("/trade/market_buy", params);

    addBtcVolume(Number(params.units));
  } catch (e) {
    // retry
    await bithumb.xcoinApiCall("/trade/market_buy", params);
    addBtcVolume(Number(params.units));
  }
}

async function sell(bithumb, params) {
  try {
    await bithumb.xcoinApiCall("/trade/market_sell", params);
    addBtcVolume(Number(params.units));
  } catch (e) {
    // retry
    await bithumb.xcoinApiCall("/trade/market_sell", params);
    addBtcVolume(Number(params.units));
  }
}

async function start() {
  const btnText = document.querySelector("#start-btn").innerText;

  if (btnText === "주문 중...") {
    ipcRenderer.invoke("tryStop", true);
    document.querySelector("#start-btn").innerText = "주문 시작";
    return;
  } else {
    document.querySelector("#start-btn").innerText = "주문 중...";
    ipcRenderer.invoke("tryStop", false);
  }

  try {
    const bithumb = updateBithumb();

    const { krw_target_volume, order_currency, payment_currency, krw_amount } = getValues();

    const units = await calculateUnits(bithumb);

    const params = {
      units: units,
      order_currency,
      payment_currency,
    };

    const loopLength = Math.floor(krw_target_volume / krw_amount) / 2;

    for (let i = 0; i < loopLength; i++) {
      const tryStop = await ipcRenderer.invoke("getTryStop");
      if (tryStop) {
        break;
      }
      try {
        await buy(bithumb, params);
      } catch (e) {
        console.log("buy failed");
      }
      try {
        await sell(bithumb, params);

        if (i % 5 === 0) {
          await sell(bithumb, params);
        }
      } catch (e) {
        console.log("sell failed");
      }
      //   ipcRenderer.invoke("addLoopCount");
    }
  } catch (err) {
    alert(err);
  } finally {
    document.querySelector("#start-btn").innerText = "주문 시작";
  }
}

function numberToKorean(number) {
  var inputNumber = number < 0 ? false : number;
  var unitWords = ["", "만", "억", "조", "경"];
  var splitUnit = 10000;
  var splitCount = unitWords.length;
  var resultArray = [];
  var resultString = "";

  for (var i = 0; i < splitCount; i++) {
    var unitResult = (inputNumber % Math.pow(splitUnit, i + 1)) / Math.pow(splitUnit, i);
    unitResult = Math.floor(unitResult);
    if (unitResult > 0) {
      resultArray[i] = unitResult;
    }
  }

  for (var i = 0; i < resultArray.length; i++) {
    if (!resultArray[i]) continue;
    resultString = String(resultArray[i]) + unitWords[i] + resultString;
  }

  return resultString;
}
