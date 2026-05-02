'use client';
import React, {
  useCallback,
  useMemo,
  useRef,
  useState,
  useEffect,
} from "react";
import { AgGridReact } from "ag-grid-react";
//import { AllCommunityModule, ModuleRegistry } from "ag-grid-community";
import {
  ClientSideRowModelApiModule,
  ClientSideRowModelModule,
  ModuleRegistry,
  RowApiModule,
  RowStyleModule,
  RowSelectionModule,
  ColumnApiModule,
  NumberFilterModule,
  TextFilterModule,
  PaginationModule,
  HighlightChangesModule,
  ValidationModule,
} from "ag-grid-community";
//import "./App.css"

//ModuleRegistry.registerModules([AllCommunityModule]);
ModuleRegistry.registerModules([
  ClientSideRowModelApiModule,
  ClientSideRowModelModule,
  RowApiModule,
  RowStyleModule,
  RowSelectionModule,
  ColumnApiModule,
  TextFilterModule,
  NumberFilterModule,
  PaginationModule,
  HighlightChangesModule,
  ValidationModule,
]);

const App = () => {
  let key = 0;
  let waitReconnect = null;
  const pagination = true;
  const paginationPageSize = 50;
  const paginationPageSizeSelector = [50, 150, 200];
  const lastId = useRef(0);
  const lastRow = useRef(null);
  const ws = useRef(null);
  const stop = useRef(false);
  const over = useRef(false);
  const timeOut = useRef(null);
  const gridRef = useRef(null);
  const errorCount = useRef(0);
  const waitTime = useRef(30000);
  const containerStyle = useMemo(() => ({ width: "100%", height: "100%" }), []);
  const gridStyle = useMemo(() => ({ width: "100%", height: "100%" }), []);
  const [documentValue, setDocumentValue] = useState(2);
  const [isCloseBtnDisabled, setCloseBtnDisabled] = useState(true);
  const [isCollectBtnDisabled, setCollectBtnDisabled] = useState(true);
  const [isNextBtnDisabled, setNextBtnDisabled] = useState(true);
  const [isClearGridBtnDisabled, setClearGridBtnDisabled] = useState(true);
  const [isClearLogBtnDisabled, setClearLogBtnDisabled] = useState(true);
  const [pauseBtnText, setPauseBtnText] = useState("开始");
  const [isCompressChecked, setCompressChecked] = useState(false);
  const [isBatchChecked, setBatchChecked] = useState(false);
  const [rowData, setRowData] = useState([]);
  const [logData, setLogData] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [isSendBtnDisabled, setSendBtnDisabled] = useState(true);
  const getRowId = useCallback((params) => String(params.data.offsetId), []);

  const resultRenderer = useCallback((params) => {
    return params.value === true ?
      <span className="missionSpan">
        {<img alt="" src="icons/tick-in-circle.png" className="missionIcon"/>}
      </span> :
      params.value === false ?
        <span className="missionSpan">
          {<img alt="" src="icons/cross-in-circle.png" className="missionIcon"/>}
        </span> :
        "";
  }, []);

  const renderSize = useCallback((value) => {
    if (value) {
      const unitArr = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
      let index = 0;
      const srcsize = parseFloat(value);
      index = Math.floor(Math.log(srcsize) / Math.log(1024));
      let size = srcsize / Math.pow(1024, index);
      size = size.toFixed(2);
      return size + unitArr[index];
    } else {
      // return "0 Bytes";
      return "";
    }
  }, []);

  const renderTime = useCallback((timestamp ) => {
    if (timestamp && timestamp > 0) {
      const dateTime = new Date(timestamp);
      let hour = dateTime.getHours();
      // if (hour < 10) {
      //   hour = "0" + hour;
      // }
      let minute = dateTime.getMinutes();
      if (minute < 10) {
        minute = "0" + minute;
      }
      return hour + ":" + minute;
    } else {
      return "";
    }
  }, []);

  const utcToTimestamp = useCallback((utcTime) => {
    if (utcTime && utcTime > 0) {
      const secondTemp = Math.floor(utcTime / 1000);
      if (secondTemp > 60) {
        const second = secondTemp % 60;
        if (second > 0) {
          return Math.floor(secondTemp / 60) + "分" + second + "秒";
        } else {
          return Math.floor(secondTemp / 60) + "分";
        }
      } else {
        if (secondTemp === 0) {
          return "1秒";
        } else {
          return secondTemp + "秒";
        }
      }
    } else {
      return "";
    }
  }, []);

  const getColumnDefs = () => {
    return [
      {
        headerName: "data",
        groupId: "data",
        openByDefault: true,
        children: [
          {
            field: "step",
            headerName: "step",
            columnGroupShow: "closed",
          },
          {
            field: "chatId",
            headerName:"chatId",
            columnGroupShow: "closed",
          },
          // {
          //   field: "messageLength",
          //   headerName: "messageLength",
          //   columnGroupShow: "closed",
          // },
          // {
          //   field: "messageIndex",
          //   headerName: "messageIndex",
          //   columnGroupShow: "closed",
          // },
          {
            field: "offsetId",
            headerName:"offsetId",
            columnGroupShow: "open",
          },
          {
            field: "dcId",
            headerName: "dcId",
            columnGroupShow: "open",
          },
          {
            field: "category",
            headerName:"category",
            columnGroupShow: "closed",
          },
          {
            field: "messageId",
            headerName:"messageId",
            columnGroupShow: "closed",
          },
          {
            field: "id",
            headerName: "id",
            columnGroupShow: "closed",
          },
          {
            field: "accessHash",
            headerName: "accessHash",
            columnGroupShow: "closed",
          },
        ],
      },
      {
        headerName: "media",
        groupId: "media",
        openByDefault: true,
        children: [
          {
            field: "size",
            headerName: "size",
            columnGroupShow: "open",
            valueFormatter: params => renderSize(params.value),
          },
          {
            field: "fileName",
            headerName: "fileName",
            columnGroupShow: "closed",
          },
          {
            field: "type",
            headerName: "type",
            columnGroupShow: "closed",
          },
          {
            field: "duration",
            headerName: "duration",
            columnGroupShow: "closed",
          },
          {
            field: "width",
            headerName: "width",
            columnGroupShow: "closed",
          },
          {
            field: "height",
            headerName: "height",
            columnGroupShow: "closed",
          },
        ],
      },
      {
        headerName: "photo",
        groupId: "photo",
        openByDefault: true,
        children: [
          {
            field: "type",
            headerName: "type",
            columnGroupShow: "open",
          },
          {
            field: "photoLength",
            headerName: "photoLength",
            columnGroupShow: "closed",
          },
          {
            field: "photoIndex",
            headerName: "photoIndex",
            columnGroupShow: "closed",
          },
        ],
      },
      {
        headerName: "status",
        groupId: "status",
        openByDefault: true,
        children: [
          {
            field: "hashLength",
            headerName: "hashLength",
            columnGroupShow: "open",
          },
          {
            field: "hashIndex",
            headerName: "hashIndex",
            columnGroupShow: "open",
          },
          {
            field: "selectIndex",
            headerName: "selectIndex",
            columnGroupShow: "open",
            cellRenderer: resultRenderer,
          },
          {
            field: "selectFile",
            headerName: "selectFile",
            columnGroupShow: "open",
            cellRenderer: resultRenderer,
          },
          {
            field: "insertFile",
            headerName: "insertFile",
            columnGroupShow: "open",
            cellRenderer: resultRenderer,
          },
          {
            field: "insertIndex",
            headerName: "insertIndex",
            columnGroupShow: "open",
            cellRenderer: resultRenderer,
          },
          {
            field: "selectMessage",
            headerName: "selectMessage",
            columnGroupShow: "open",
            cellRenderer: resultRenderer,
          },
          {
            field: "insertMessage",
            headerName: "insertMessage",
            columnGroupShow: "open",
            cellRenderer: resultRenderer,
          },
          {
            field: "error",
            headerName: "error",
            columnGroupShow: "open",
          },
          {
            field: "time",
            headerName: "startTime",
            columnGroupShow: "open",
            cellRenderer: params => renderTime(params.value),
          },
          {
            field: "date",
            headerName: "endTime",
            columnGroupShow: "open",
            cellRenderer: params => renderTime(params.value),
          },
          {
            field: "useTime",
            headerName: "useTime",
            columnGroupShow: "open",
            cellRenderer: params => utcToTimestamp(params.value),
          },
          // {
          //   field: "status",
          //   headerName: "status",
          //   columnGroupShow: "open",
          //   cellRenderer: resultRenderer,
          // },
        ],
      },
    ]
  };

  const [colDefs] = useState(getColumnDefs);

  const defaultColDef = useMemo(() => {
    return {
      flex: 1,
      //filter: true,
      width: "100%",
      height: "70%",
      editable: false,
      enableCellChangeFlash: true,
    };
  }, []);

  const rowSelection = useMemo(() => {
    return {
      //mode: "multiRow",
      mode: "singleRow",
      checkboxes: false,
      headerCheckbox: false,
      enableClickSelection: true,
    };
  }, []);

  const rowClassRules = useMemo(() => {
    return {
      "rag-red": params => stop.current === true && params.node.data.offsetId === lastRow.current.data.offsetId,
    };
  }, []);

  const addNewEvent = useCallback((newItem) => {
    // if (logData.length >= 100) {
    //   setLogData([]);
    //   console.log("删除log成功");  //测试
    // }
    setLogData((prevState) => {
      // const newList = prevState.slice();
      // //newList.push(newItem);
      // newList.unshift(newItem);
      // //console.log(newList.length);  //测试
      // //console.log(newList);  //测试
      // return newList;
      // return [...prevState, newItem];
      // return [newItem, ...prevState];
      newItem.key = ++key;
      if (prevState.length > 0) {
        return [newItem, ...prevState];
      } else {
        return [newItem];
      }
    });
    // if (logData.length === 0) {
    //   setClearLogBtnDisabled(true);
    // } else {
    //   setClearLogBtnDisabled(false);
    // }
  }, [setLogData, key]);

  const addItems = useCallback((items) => {
    if (gridRef.current.api.getDisplayedRowCount() >= 200) {
      setRowData([]);
      setClearGridBtnDisabled(true);
      console.log("删除grid成功");  //测试
    }
    const res = gridRef.current.api.applyTransaction({
      add: items,
      addIndex: 0,
    });
    //console.log(res);  //测试
    if (res.add && res.add.length > 0) {
      lastRow.current = res.add[0];
      //console.log(lastRow.current);  //测试
      lastId.current = lastRow.current.data.offsetId;
    } else {
      lastRow.current = null;
      lastId.current = 0;
      console.log("添加row失败");
      addNewEvent({
        "message": renderTime(Date.now()) + "  >>> 添加row失败",
      });
      //console.log(items);  //测试
    }
    if (gridRef.current.api.getDisplayedRowCount() === 0) {
      setClearGridBtnDisabled(true);
    } else {
      setClearGridBtnDisabled(false);
    }
  }, [addNewEvent, renderTime, setRowData, setClearGridBtnDisabled]);

  const updateLastRow = useCallback((items) => {
    if (items.date && (items.date >= lastRow.current.data.time)) {
      lastRow.current.setDataValue("useTime", items.date - lastRow.current.data.time);
    }
    for (const name in items) {
      //console.log(name);  //测试
      //console.log(items[name]);  //测试
      if (name === "error") {
        if (items[name] === true) {
          if (lastRow.current.data.error > 0) {
            lastRow.current.setDataValue("error", lastRow.current.data.error + 1);
          } else {
            lastRow.current.setDataValue("error", 1);
          }
        }
      } else {
        lastRow.current.setDataValue(name, items[name]);
      }
    }
  }, []);

  const getLastRow = useCallback((offsetId, items) => {
    let found = false;
    gridRef.current.api.forEachNode((rowNode) => {
      if (rowNode.data.offsetId === offsetId) {
        lastRow.current = rowNode;
        lastId.current = lastRow.current.data.offsetId;
        updateLastRow(items);
        found = true;
        return;
      }
    });
    if (found === false) {
      // console.log("lastRow错误");
      // addNewEvent({
      //   "error": true,
      //   "message": renderTime(Date.now()) + "  >>> lastRow错误",
      // });
      addItems({offsetId, ...items});
    }
  }, [updateLastRow, addItems]);

  const updateItems = useCallback((data) => {
    //console.log(lastRow.current);  //测试
    const {offsetId, ...items} = data;
    if (lastRow.current) {
      //console.log(offsetId);  //测试
      //console.log(items);  //测试
      if (lastId.current === offsetId) {
        updateLastRow(items);
      } else {
        getLastRow(offsetId, items);
      }
    } else {
      getLastRow(offsetId, items);
    }
  }, [updateLastRow, getLastRow]);

  const updateSelect = useCallback((message, name) => {
    if (message.status === "try") {
      updateItems({
        "offsetId": message.offsetId,
        [name]: false,
        "error": true,
        "date": message.date,
      });
      addNewEvent({
        "error": true,
        "message": renderTime(message.date) + " " + message.offsetId + ":" + message.operate + "-" + message.message,
      });
    } else {
      console.log("未知消息");
    }
  }, [addNewEvent, renderTime, updateItems]);

  const updateInsert = useCallback((message, name) => {
    if (message.status === "success") {
      updateItems({
        "offsetId": message.offsetId,
        [name]: true,
        "date": message.date,
      });
    } else if (message.status === "error") {
      updateItems({
        "offsetId": message.offsetId,
        [name]: false,
        "date": message.date,
      });
      addNewEvent({
        "error": true,
        "message": renderTime(message.date) + " " + message.offsetId + ":" + message.operate + "-" + message.message,
      });
    } else if (message.status === "try") {
      addNewEvent({
        "error": true,
        "message": renderTime(message.date) + " " + message.offsetId + ":" + message.operate + "-" + message.message,
      });
    } else {
      console.log("未知消息");
    }
  }, [addNewEvent, renderTime, updateItems]);

  const handleBeforeUnload = useCallback((event) => {
    event.preventDefault();
    event.returnValue = '程序正在运行中，确定要关闭吗？';
  }, []);

  const handlerBtn = useCallback((status) => {
    setCollectBtnDisabled(status);
    setCloseBtnDisabled(status);
    setNextBtnDisabled(status);
  }, [setCollectBtnDisabled, setCloseBtnDisabled, setNextBtnDisabled]);

  const handlerBtnUnable = useCallback(() => {
    handlerBtn(true);
    // // if (pauseBtnText === "暂停") {
    // if (pauseBtnText !== "开始") {
      setPauseBtnText("开始");
    // }
  // }, [handlerBtn, setPauseBtnText, pauseBtnText]);
  }, [handlerBtn, setPauseBtnText]);

  const handlerBtnEnable = useCallback(() => {
    handlerBtn(false);
    // // if (pauseBtnText === "开始") {
    // if (pauseBtnText !== "暂停") {
      setPauseBtnText("暂停");
    // }
  // }, [handlerBtn, setPauseBtnText, pauseBtnText]);
  }, [handlerBtn, setPauseBtnText]);

  const handlerClose = useCallback(() => {
    ws.current = null;
    stop.current = true;
    errorCount.current += 1;
    if (errorCount.current === 10) {
      waitTime.current = 300000;
    }
    window.removeEventListener('beforeunload', handleBeforeUnload);
    window.removeEventListener('popstate', handleBeforeUnload);
    if (lastRow.current) {
      gridRef.current.api.redrawRows({
        rowNodes: [lastRow.current],
      });
    }
    handlerBtnUnable();
    // setLogData(() => {
    //   return [];
    // });
    //console.log("远程websocket连续" + errorCount.current + "次断开了连接");  //测试
    addNewEvent({
      "error": true,
      "message": renderTime(Date.now()) + "  >>> 远程websocket连续" + errorCount.current + "次断开了连接",
    });
  }, [addNewEvent, renderTime, handleBeforeUnload, handlerBtnUnable]);

  const parseMessage = useCallback((message) => {
    if (message.result === "pause") {
      //console.log("远程websocket已停止完毕");  //测试
      addNewEvent({
        "error": true,
        "message": renderTime(Date.now()) + "  >>> 远程websocket已停止完毕",
      });
      ws.current.close();
      // handlerClose();
    } else if (message.result === "end") {
      lastId.current = 0;
      lastRow.current = null;
      // setRowData([]);
      // setClearGridBtnDisabled(true);
      // setLogData(() => {
      //   return [];
      // });
      // setClearLogBtnDisabled(true);
      //console.log("当前chat采集完毕");  //测试
      // addNewEvent({
      //   "message": renderTime(Date.now()) + "  >>>当前chat采集完毕",
      //   // "message": renderTime(message.date) + " " + message.operate + "-" + message.message,
      // });
    } else if (message.result === "over") {
      over.current = true;
      clearTimeout(timeOut.current);
      //console.log("全部chat采集完毕");  //测试
      // addNewEvent({
      //   "message": renderTime(Date.now()) + "  >>>全部chat采集完毕",
      //   // "message": renderTime(message.date) + " " + message.operate + "-" + message.message,
      // });
    } else {
      if (message.offsetId && message.offsetId >= 0) {
        if (message.offsetId < lastId.current) {
          console.log("消息offsetId小了");
          addNewEvent({
            "error": true,
            "message": renderTime(message.date) + " " + message.offsetId + ":" + message.operate + " 消息offsetId小了" + (message.message ? "-" + message.message  : " "),
          });
        } else {
          switch (message.operate) {
            case "nextHash":
              if (message.status === "update") {
                if (message.hashIndex && message.hashIndex > 0) {
                  updateItems({
                    "offsetId": message.offsetId,
                    "hashIndex": message.hashIndex,
                    "date": message.date,
                  });
                } else {
                  console.log("hashIndex错误");
                }
              } else if (message.status === "error") {
                updateItems({
                  "offsetId": message.offsetId,
                  "date": message.date,
                });
                addNewEvent({
                  "error": true,
                  "message": renderTime(message.date) + " " + message.offsetId + ":" + message.operate + "-" + message.message,
                });
              } else if (message.status === "limit") {
                addNewEvent({
                  "error": true,
                  "message": renderTime(message.date) + " " + message.offsetId + ":" + message.operate + "-" + message.message,
                });
              } else {
                console.log("未知消息");
              }
              break;
            case "getHash":
              if (message.status === "try") {
                updateItems({
                  "offsetId": message.offsetId,
                  "hashIndex": message.hashIndex,
                  "date": message.date,
                });
                // if (message.hashIndex === 1) {
                //   addNewEvent({
                //     "error": true,
                //     "message": renderTime(message.date) + " " + message.offsetId + ":" + message.operate + " - 查询首个hash出错 - " + message.message,
                //   });
                // } else if (message.hashIndex > 1) {
                if (message.hashIndex && message.hashIndex > 0) {
                  addNewEvent({
                    "error": true,
                    "message": renderTime(message.date) + " " + message.offsetId + ":" + message.operate + " - 查询hash出错",
                  });
                } else {
                  console.log("hashIndex错误");
                }
              } else {
                console.log("未知消息");
              }
              break;
            case "nextMessage":
              if (message.status === "add") {
                if (!lastRow.current || lastRow.current.data.offsetId !== message.offsetId) {
                  //delete message.operate;
                  //delete message.status;
                  const {
                    operate,
                    status,
                    ...temp
                  } = message;
                  addItems([temp]);
                }
              } else if (message.status === "error") {
                if (isCompressChecked === false) {
                  updateItems({
                    "offsetId": message.offsetId,
                    "date": message.date,
                  });
                }
                addNewEvent({
                  "error": true,
                  "message": renderTime(message.date) + " " + message.offsetId + ":" + message.operate + "-" + message.message,
                });
              } else if (message.status === "limit") {
                addNewEvent({
                  "error": true,
                  "message": renderTime(message.date) + " " + message.offsetId + ":" + message.operate + "-" + message.message,
                });
              } else {
                console.log("未知消息");
              }
              break;
            case "getMedia":
            case "getPhoto":
            case "getFile":
              if (message.status === "update") {
                const {
                  operate,
                  status,
                  ...temp
                } = message;
                updateItems(temp);
              } else if (message.status === "error") {
                if (isCompressChecked === false) {
                  updateItems({
                    "offsetId": message.offsetId,
                    "date": message.date,
                  });
                }
                addNewEvent({
                  "error": true,
                  "message": renderTime(message.date) + " " + message.offsetId + ":" + message.operate + "-" + message.message,
                });
              } else if (message.status === "indexExist") {
                updateItems({
                  "offsetId": message.offsetId,
                  "selectIndex": true,
                  "date": message.date,
                });
              } else if (message.status === "fileExist") {
                updateItems({
                  "offsetId": message.offsetId,
                  "selectFile": true,
                  "date": message.date,
                });
              } else if (message.status === "cache") {
                addNewEvent({
                  "error": true,
                  "message": renderTime(message.date) + " " + message.offsetId + ":" + message.operate + "-" + message.message,
                });
              } else {
                console.log("未知消息");
              }
              break;
            case "selectMediaIndex":
              updateSelect(message, "selectIndex");
              break;
            case "insertMedia":
              updateInsert(message, "insertFile");
              break;
            case "insertMediaIndex":
              updateInsert(message, "insertIndex");
              break;
            case "selectPhotoIndex":
              updateSelect(message, "selectIndex");
              break;
            case "insertPhoto":
              updateInsert(message, "insertFile");
              break;
            case "insertPhotoIndex":
              updateInsert(message, "insertIndex");
              break;
            case "endMessage":
              if (message.status === "try") {
                updateItems({
                  "offsetId": message.offsetId,
                  "date": message.date,
                });
                addNewEvent({
                  "error": true,
                  "message": renderTime(message.date) + " " + message.offsetId + ":" + message.operate + "-" + message.message,
                });
              } else {
                console.log("未知消息");
              }
              break;
            case "selectMessage":
              updateSelect(message, "selectMessage");
              break;
            case "insertMessage":
              updateInsert(message, "insertMessage");
              break;
            case "endInsert":
              if (message.status === "exist") {
                updateItems({
                  "offsetId": message.offsetId,
                  "selectMessage": true,
                  "date": message.date,
                });
              } else {
                console.log("未知消息");
              }
              break;
            default:
              console.log("未知消息");
          }
        }
      } else {
        addNewEvent({
          "error": message.error,
          "message": renderTime(message.date) + (message.step ? "  (" + message.step + ")":" ") + message.operate + "-" + message.message,
        });
      }
    }
  }, [addNewEvent, renderTime, setRowData, setClearGridBtnDisabled, setLogData, setClearLogBtnDisabled, addItems, updateInsert, updateItems, updateSelect, isCompressChecked]);

  const setTime = useCallback(() => {
    clearTimeout(timeOut.current);
    // let time = 120000;
    // let count = 2;
    // if (documentValue === 1) {
    //   time = 60000;
    //   count = 1;
    // }
    timeOut.current = setTimeout(function() {
      if (over.current === false) {
        addNewEvent({
          "error": true,
          // "message": renderTime(Date.now()) + "  >>> 过了" + count + "分钟都没有收到任何消息",
          "message": renderTime(Date.now()) + "  >>> 过了1分钟都没有收到任何消息",
        });
        if (ws.current && ws.current.readyState === WebSocket.OPEN) {
          ws.current.send(JSON.stringify({
            "command": "close",
          }));
          ws.current.close();
          // handlerClose();
        }
      } else {
        //console.log("停止采集，不再继续send");  //测试
        addNewEvent({
          "error": true,
          "message": renderTime(Date.now()) + "  >>> 停止采集，不再继续send",
        });
      }
    // }, time);
    }, 60000);
//  }, [addNewEvent, renderTime, documentValue]);
 }, [addNewEvent, renderTime]);

  const collectWS = useCallback((command) => {
    // console.log("documentValue : " + documentValue);  //测试
    //const url = "wss://workers.19425.xyz/ws";  //测试
    const url = new URL(window.location);
    url.protocol = "wss";
    url.pathname = "/ws";
    ws.current = new WebSocket(url);
    if (!ws.current) {
      errorCount.current += 1;
      if (errorCount.current === 10) {
        waitTime.current = 300000;
      }
      throw new Error("  >>> 连续" + errorCount.current + "次连接远程websocket失败");
    }

    ws.current.addEventListener("open", () => {
      stop.current = false;
      //console.log("连接远程websocket成功，准备send");  //测试
      addNewEvent({
        "message": renderTime(Date.now()) + "  >>> 连接远程websocket成功，准备send",
      });
      if (errorCount.current > 0) {
        errorCount.current = 0;
        if (waitTime.current !== 30000) {
          waitTime.current = 30000;
        }
      }
      window.addEventListener('beforeunload', handleBeforeUnload);
      window.addEventListener('popstate', handleBeforeUnload);
      if (lastRow.current) {
        gridRef.current.api.redrawRows({
          rowNodes: [lastRow.current],
        });
      }
      if (ws.current && ws.current.readyState === WebSocket.OPEN) {
        try {
          ws.current.send(command);
          setTime();
        } catch (e) {
          console.log(e);  //测试
          addNewEvent({
            "error": true,
            "message": renderTime(Date.now()) + "  >>> send失败",
          });
          if (ws.current && ws.current.readyState === WebSocket.OPEN) {
            ws.current.close();
            // handlerClose();
          }
          // waitReconnect(JSON.stringify({
          //   "command": "start",
          //   "filterType": documentValue,
          // }), waitTime.current);
        }
      } else {
        //console.log(command + "失败");  //测试
        addNewEvent({
          "error": true,
          "message": renderTime(Date.now()) + "  >>> " + command + "失败",
        });
      }
    })

    ws.current.addEventListener("message", ({ data }) => {
      if (data) {
        let message = null;
        try {
          message = JSON.parse(data);
        } catch (e) {
          //console.log("解析JSON失败");  //测试
          addNewEvent({
            "error": true,
            "message": renderTime(Date.now()) + "  >>> 解析JSON失败",
          });
        }
        if (message) {
          const length = message.length;
          if (length && length > 0) {
            for (let index = 0; index < length; index++) {
              parseMessage(message[index]);
            }
          } else {
            parseMessage(message);
          }
        } else {
          //console.log("message错误");  //测试
          addNewEvent({
            "error": true,
            "message": renderTime(Date.now()) + "  >>> message错误",
          });
        }
      } else {
        console.log("消息为空");
        addNewEvent({
          "error": true,
          "message": renderTime(Date.now()) + "  >>> 消息为空",
        });
      }
      setTime();
    })

    ws.current.addEventListener("close", () => {
      handlerClose();
      if (over.current === false) {
        // console.log(documentValue);  //测试
        waitReconnect(JSON.stringify({
          "command": "start",
          "filterType": documentValue,
        }), waitTime.current);
      }
    })

  }, [addNewEvent, renderTime, handleBeforeUnload, parseMessage, setTime, handlerClose, waitReconnect, documentValue]);

  waitReconnect = useCallback((command, time) => {
    setTimeout(function() {
      if (over.current === false) {
        handlerBtnEnable();
        //console.log("连接远程websocket");  //测试
        addNewEvent({
          "message": renderTime(Date.now()) + "  >>> 连接远程websocket",
        });
        try {
          collectWS(command);
        } catch (e) {
          handlerBtnUnable();
          //console.log("连接远程websocket失败");  //测试
          addNewEvent({
            "error": true,
            "message": renderTime(Date.now()) + "  >>> 连接远程websocket失败",
          });
          waitReconnect(command, time);
        }
      } else {
        //console.log("停止采集，不再继续send");  //测试
        addNewEvent({
          "error": true,
          "message": renderTime(Date.now()) + "  >>> 停止采集，不再继续send",
        });
      }
    }, time);
  }, [addNewEvent, renderTime, handlerBtnEnable, collectWS, handlerBtnUnable, waitReconnect]);

  const handlerRadioChange = useCallback((e) => {
    // console.log(parseInt(e.target.value));  //测试
    setDocumentValue(parseInt(e.target.value));
  }, [setDocumentValue]);

  const handlerMessageError = useCallback((message) => {
    addNewEvent({
      "error": true,
      "message": renderTime(Date.now()) + message,
    });
  }, [addNewEvent, renderTime]);

  const handlerPauseBtnClick = useCallback(() => {
    //console.log(pauseBtnText);  //测试
    if (pauseBtnText === "暂停") {
      setPauseBtnText("开始");
      handlerBtn(true);
      //console.log(ws.current);  //测试
      if (ws.current && ws.current.readyState === WebSocket.OPEN) {
        try {
          ws.current.send(JSON.stringify({
            "command": "pause",
          }));
        } catch (e) {
          // console.log(e);  //测试
          handlerBtnEnable();
          handlerMessageError("  >>> pause失败");
        }
      } else {
        handlerBtnEnable();
        handlerMessageError("  >>> 没有连接ws");
      }
    } else if (pauseBtnText === "开始") {
      // console.log(documentValue);  //测试
      setPauseBtnText("暂停");
      handlerBtn(false);
      if (!ws.current || ws.current.readyState !== WebSocket.OPEN) {
        waitReconnect(JSON.stringify({
          "command": "start",
          "filterType": documentValue,
        }), 1000);
      }
    }
  }, [setPauseBtnText, handlerBtn, handlerBtnEnable, handlerMessageError, waitReconnect, pauseBtnText, documentValue]);

  const handlerCollectBtnClick = useCallback(() => {
    handlerBtnUnable();
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      try {
        ws.current.close();
        // handlerClose();
      } catch (e) {
        // console.log(e);  //测试
        handlerBtnEnable();
        handlerMessageError("  >>> collect失败");
      }
    } else {
      handlerBtnEnable();
      handlerMessageError("  >>> 没有连接ws");
    }
  }, [handlerBtnUnable, handlerBtnEnable, handlerMessageError]);

  const handlerCloseBtnClick = useCallback(() => {
    handlerBtnUnable();
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      try {
        ws.current.send(JSON.stringify({
          "command": "close",
        }));
      } catch (e) {
        // console.log(e);  //测试
        handlerBtnEnable();
        handlerMessageError("  >>> close失败");
      }
    } else {
      handlerBtnEnable();
      handlerMessageError("  >>> 没有连接ws");
    }
  }, [handlerBtnUnable, handlerBtnEnable, handlerMessageError]);

  const handlerNextBtnClick = useCallback(() => {
    setNextBtnDisabled(true);
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      try {
        ws.current.send(JSON.stringify({
          "command": "over",
        }));
      } catch (e) {
        // console.log(e);  //测试
        handlerMessageError("  >>> next失败");
        setNextBtnDisabled(false);
      }
    } else {
      handlerMessageError("  >>> 没有连接ws");
      setNextBtnDisabled(false);
    }
  }, [setNextBtnDisabled, handlerMessageError]);

  const handlerChatBtnClick = useCallback(() => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      try {
        ws.current.send(JSON.stringify({
          "command": "chat",
        }));
      } catch (e) {
        // console.log(e);  //测试
        handlerMessageError("  >>> chat失败");
      }
    } else {
      waitReconnect(JSON.stringify({
        "command": "chat",
      }), 1000);
    }
  }, [handlerMessageError, waitReconnect]);

  const handlerClearCacheBtnClick = useCallback(() => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      try {
        ws.current.send(JSON.stringify({
          "command": "clear",
        }));
      } catch (e) {
        // console.log(e);  //测试
        handlerMessageError("  >>> clear失败");
      }
    } else {
      handlerMessageError("  >>> 没有连接ws");
    }
  }, [handlerMessageError]);

  const handlerClearGridBtnClick = useCallback(() => {
    lastId.current = 0;
    lastRow.current = null;
    setRowData([]);
    setClearGridBtnDisabled(true);
  }, [setRowData, setClearGridBtnDisabled]);

  const handlerClearLogBtnClick = useCallback(() => {
    setLogData(() => {
      return [];
    });
    setClearLogBtnDisabled(true);
  }, [setLogData, setClearLogBtnDisabled]);

  const handlerCompressChange = useCallback(() => {
    const isCompress = isCompressChecked;
    setCompressChecked(!isCompress);
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      try {
        if (isCompress === true) {
          ws.current.send(JSON.stringify({
            "command": "noCompress",
          }));
        } else if (isCompress === false) {
          ws.current.send(JSON.stringify({
            "command": "compress",
          }));
        }
      } catch (e) {
        // console.log(e);  //测试
        handlerMessageError("  >>> compress失败");
        setCompressChecked(isCompress);
      }
    }
  }, [setCompressChecked, handlerMessageError, isCompressChecked]);

  const handlerBatchChange = useCallback(() => {
    const isBatch = isBatchChecked;
    setBatchChecked(!isBatch);
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      try {
        if (isBatch === true) {
          ws.current.send(JSON.stringify({
            "command": "noBatch",
          }));
        } else if (isBatch === false) {
          ws.current.send(JSON.stringify({
            "command": "batch",
          }));
        }
      } catch (e) {
        // console.log(e);  //测试
        handlerMessageError("  >>> batch失败");
        setBatchChecked(isBatch);
      }
    }
  }, [setBatchChecked, handlerMessageError, isBatchChecked]);

  const inputHandleChange = useCallback((e) => {
    setInputValue(e.target.value);
  }, [setInputValue]);

  const handlerSendBtnClick = useCallback(() => {
    setSendBtnDisabled(true);
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      try {
        ws.current.send(JSON.stringify({
          "command": inputValue,
        }));
        setInputValue("");
      } catch (e) {
        // console.log(e);  //测试
        handlerMessageError("  >>> send失败");
        setSendBtnDisabled(false);
      }
    } else {
      // handlerMessageError("  >>> 没有连接ws");
      // setSendBtnDisabled(false);
      waitReconnect(inputValue, 1000);
    }
  }, [setSendBtnDisabled, setInputValue, handlerMessageError, waitReconnect, inputValue]);

  // useEffect(() => {
  //   if (rowData.length === 0) {
  //     setClearGridBtnDisabled(true);
  //   } else if (rowData.length >= 200) {
  //     setLogData(() => {
  //       return [];
  //     });
  //     setClearGridBtnDisabled(true);
  //     console.log("删除grid成功");  //测试
  //   } else {
  //     setClearGridBtnDisabled(false);
  //   }
  // //    return () => {
  // //    }
  // },[setClearGridBtnDisabled, setLogData, rowData]);

  useEffect(() => {
    if (logData.length === 0) {
      setClearLogBtnDisabled(true);
    } else if (logData.length >= 100) {
      setLogData(() => {
        return [];
      });
      setClearLogBtnDisabled(false);
      console.log("删除log成功");  //测试
    } else {
      setClearLogBtnDisabled(false);
    }
//    return () => {
//    }
  },[setClearLogBtnDisabled, setLogData, logData]);

  useEffect(() => {
    if (inputValue) {
      setSendBtnDisabled(false);
    } else {
      setSendBtnDisabled(true);
    }
//    return () => {
//    }
  },[setSendBtnDisabled, inputValue]);

  // useEffect(() => {
  //   const handleBeforeUnload = (event) => {
  //     //event.preventDefault();
  //     event.returnValue = '程序正在运行，确定要关闭吗？';
  //   };
  //   window.addEventListener('beforeunload', handleBeforeUnload);
  //   return () => {
  //     window.removeEventListener('beforeunload', handleBeforeUnload);
  //   };
  // }, []);

  return (
    <div style={containerStyle}>
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column" }}>
        <div style={gridStyle}>
          <AgGridReact
            ref={gridRef}
            rowData={rowData}
            columnDefs={colDefs}
            defaultColDef={defaultColDef}
            getRowId={getRowId}
            rowClassRules={rowClassRules}
            rowSelection={rowSelection}
            pagination={pagination}
            paginationPageSize={paginationPageSize}
            paginationPageSizeSelector={paginationPageSizeSelector}
          />
        </div>
        <div style={{ width: "100%" }}>
          <label>
            <input type="radio" name="filterType" value="0" checked={documentValue === 0} onChange={handlerRadioChange} />
            媒体
          </label>
          <label>
            <input type="radio" name="filterType" value="1" checked={documentValue === 1} onChange={handlerRadioChange} />
            图片
          </label>
          <label>
            <input type="radio" name="filterType" value="2" checked={documentValue === 2} onChange={handlerRadioChange} />
            视频
          </label>
          <label>
            <input type="radio" name="filterType" value="3" checked={documentValue === 3} onChange={handlerRadioChange} />
            文件
          </label>
          <label>
            <input type="radio" name="filterType" value="4" checked={documentValue === 4} onChange={handlerRadioChange} />
            动图
          </label>
          <button onClick={handlerPauseBtnClick}>{pauseBtnText}</button>
          <button onClick={handlerCollectBtnClick} disabled={isCollectBtnDisabled}>断开</button>
          <button onClick={handlerCloseBtnClick} disabled={isCloseBtnDisabled}>强制关闭</button>
          <button onClick={handlerNextBtnClick} disabled={isNextBtnDisabled}>不再继续</button>
          <button onClick={handlerChatBtnClick}>chat</button>
          <button onClick={handlerClearCacheBtnClick}>清空cache</button>
          <button onClick={handlerClearGridBtnClick} disabled={isClearGridBtnDisabled}>清空grid</button>
          <button onClick={handlerClearLogBtnClick} disabled={isClearLogBtnDisabled}>清空log</button>
          <label>
            <input type="checkbox" checked={isCompressChecked} onChange={handlerCompressChange} />
            压缩
          </label>
          <label>
            <input type="checkbox" checked={isBatchChecked} onChange={handlerBatchChange} />
            批量
          </label>
          <input type="text" value={inputValue} onChange={inputHandleChange} />
          <button onClick={handlerSendBtnClick} disabled={isSendBtnDisabled}>发送</button>
        </div>
        <div style={{ width: "100%", height: "20%", minHeight: 0, flexGrow: 1, overflow: "auto" }}>
          <h4>日志</h4>
            <ul>
              {logData.map((item) => (
                item.error ? 
                  <li key={item.key} style={{ color: "red" }}>{item.message}</li> : 
                  <li key={item.key}>{item.message}</li>
              ))}
            </ul>
        </div>
      </div>
    </div>
  );
};

export default App
