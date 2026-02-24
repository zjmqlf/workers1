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
  const containerStyle = useMemo(() => ({ width: "100%", height: "100%", margin: "1px" }), []);
  const gridStyle = useMemo(() => ({ width: "100%", height: "100%", margin: "1px" }), []);
  const [isCloseBtnDisabled, setCloseBtnDisabled] = useState(true);
  const [isCollectBtnDisabled, setCollectBtnDisabled] = useState(true);
  const [isNextBtnDisabled, setNextBtnDisabled] = useState(true);
  const [isClearGridBtnDisabled, setClearGridBtnDisabled] = useState(true);
  const [isClearLogBtnDisabled, setClearLogBtnDisabled] = useState(true);
  const [pauseBtnText, setPauseBtnText] = useState("开始");
  const [isCompressChecked, setCompressChecked] = useState(true);
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
        ""
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
            columnGroupShow: "open",
          },
          {
            field: "chatId",
            headerName:"chatId",
            columnGroupShow: "open",
          },
          {
            field: "offsetId",
            headerName:"offsetId",
            columnGroupShow: "open",
          },
          // {
          //   field: "messageLength",
          //   headerName: "messageLength",
          //   columnGroupShow: "open",
          // },
          // {
          //   field: "messageIndex",
          //   headerName: "messageIndex",
          //   columnGroupShow: "open",
          // },
          {
            field: "messageId",
            headerName:"messageId",
            columnGroupShow: "open",
          },
        ],
      },
      {
        headerName: "status",
        groupId: "status",
        openByDefault: true,
        children: [
          {
            field: "selectMessageIndex",
            headerName: "selectMessageIndex",
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
            field: "insertMessageIndex",
            headerName: "insertMessageIndex",
            columnGroupShow: "open",
            cellRenderer: resultRenderer,
          },
          {
            field: "webpage",
            headerName: "webpage",
            columnGroupShow: "open",
            cellRenderer: resultRenderer,
          },
          {
            field: "error",
            headerName: "error",
            columnGroupShow: "open",
          },
          {
            field: "date",
            headerName: "startTime",
            cellRenderer: params => renderTime(params.value),
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

  const addItems = useCallback((newItems) => {
    if (gridRef.current.api.getDisplayedRowCount() >= 200) {
      setRowData([]);
      setClearGridBtnDisabled(true);
      console.log("删除grid成功");  //测试
    }
    const res = gridRef.current.api.applyTransaction({
      add: newItems,
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
      //console.log(newItems);  //测试
    }
    if (gridRef.current.api.getDisplayedRowCount() === 0) {
      setClearGridBtnDisabled(true);
    } else {
      setClearGridBtnDisabled(false);
    }
  }, [addNewEvent, renderTime, setRowData, setClearGridBtnDisabled]);

  const updateLastRow = useCallback((Items) => {
    if (Items.date && (Items.date >= lastRow.current.data.time)) {
      lastRow.current.setDataValue("useTime", Items.date - lastRow.current.data.time);
    }
    for (const name in Items) {
      //console.log(name);  //测试
      //console.log(Items[name]);  //测试
      if (name === "error") {
        if (Items[name] === true) {
          if (lastRow.current.data.error > 0) {
            lastRow.current.setDataValue("error", lastRow.current.data.error + 1);
          } else {
            lastRow.current.setDataValue("error", 1);
          }
        }
      } else {
        lastRow.current.setDataValue(name, Items[name]);
      }
    }
  }, []);

  const getLastRow = useCallback((offsetId, Items) => {
    let found = false;
    gridRef.current.api.forEachNode((rowNode) => {
      if (rowNode.data.offsetId === offsetId) {
        lastRow.current = rowNode;
        lastId.current = lastRow.current.data.offsetId;
        updateLastRow(Items);
        found = true;
        return;
      }
    });
    if (found === false) {
      console.log("lastRow错误");
      addNewEvent({
        "error": true,
        "message": renderTime(Date.now()) + "  >>> lastRow错误",
      });
    }
  }, [addNewEvent, renderTime, updateLastRow]);

  const updateItems = useCallback((data) => {
    //console.log(lastRow.current);  //测试
    const {offsetId, ...Items} = data;
    if (lastRow.current) {
      //console.log(offsetId);  //测试
      //console.log(Items);  //测试
      if (lastId.current === offsetId) {
        updateLastRow(Items);
      } else {
        getLastRow(offsetId, Items);
      }
    } else {
      getLastRow(offsetId, Items);
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
        "message": renderTime(message.date) + "  " + message.offsetId + " : " + message.operate + " - " + message.message,
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
        "message": renderTime(message.date) + "  " + message.offsetId + " : " + message.operate + " - " + message.message,
      });
    } else if (message.status === "try") {
      addNewEvent({
        "error": true,
        "message": renderTime(message.date) + "  " + message.offsetId + " : " + message.operate + " - " + message.message,
      });
    } else {
      console.log("未知消息");
    }
  }, [addNewEvent, renderTime, updateItems]);

  const handleBeforeUnload = useCallback((event) => {
    event.preventDefault();
    event.returnValue = '程序正在运行中，确定要关闭吗？';
  }, []);

  const btnHandler = useCallback((status) => {
    setCollectBtnDisabled(status);
    setCloseBtnDisabled(status);
    setNextBtnDisabled(status);
  }, [setCollectBtnDisabled, setCloseBtnDisabled, setNextBtnDisabled]);

  const btnUnableHandler = useCallback(() => {
    btnHandler(true);
    // // if (pauseBtnText === "暂停") {
    // if (pauseBtnText !== "开始") {
      setPauseBtnText("开始");
    // }
  // }, [btnHandler, setPauseBtnText, pauseBtnText]);
  }, [btnHandler, setPauseBtnText]);

  const btnEnableHandler = useCallback(() => {
    btnHandler(false);
    // // if (pauseBtnText === "开始") {
    // if (pauseBtnText !== "暂停") {
      setPauseBtnText("暂停");
    // }
  // }, [btnHandler, setPauseBtnText, pauseBtnText]);
  }, [btnHandler, setPauseBtnText]);

  const closeHandler = useCallback(() => {
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
    btnUnableHandler();
    // setLogData(() => {
    //   return [];
    // });
    //console.log("远程websocket连续" + errorCount.current + "次断开了连接");  //测试
    addNewEvent({
      "error": true,
      "message": renderTime(Date.now()) + "  >>> 远程websocket连续" + errorCount.current + "次断开了连接",
    });
  }, [addNewEvent, renderTime, handleBeforeUnload, btnUnableHandler]);

  const parseMessage = useCallback((message) => {
    if (message.result === "pause") {
      //console.log("远程websocket已停止完毕");  //测试
      addNewEvent({
        "error": true,
        "message": renderTime(Date.now()) + "  >>> 远程websocket已停止完毕",
      });
      ws.current.close();
      // closeHandler();
    } else if (message.result === "end") {
      lastId.current = 0;
      lastRow.current = null;
      setRowData([]);
      setClearGridBtnDisabled(true);
      // setLogData(() => {
      //   return [];
      // });
      // setClearLogBtnDisabled(true);
      //console.log("当前chat采集完毕");  //测试
      addNewEvent({
        // "message": renderTime(Date.now()) + "  >>>当前chat采集完毕",
        "message": renderTime(message.date) + "  " + message.operate + " - " + message.message,
      });
    } else if (message.result === "over") {
      over.current = true;
      //console.log("全部chat采集完毕");  //测试
      addNewEvent({
        // "message": renderTime(Date.now()) + "  >>>全部chat采集完毕",
        "message": renderTime(message.date) + "  " + message.operate + " - " + message.message,
      });
    } else {
      if (message.offsetId && message.offsetId >= 0) {
        if (message.offsetId < lastId.current) {
          console.log("消息offsetId小了");
          addNewEvent({
            "error": true,
            "message": renderTime(message.date) + " " + message.offsetId + " : " + message.operate + " 消息offsetId小了" + (message.message ? " - " + message.message  : " "),
          });
        } else {
          switch (message.operate) {
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
              } else if (message.status === "update") {
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
                  "message": renderTime(message.date) + "  " + message.offsetId + " : " + message.operate + " - " + message.message,
                });
              } else if (message.status === "exist") {
                updateItems({
                  "offsetId": message.offsetId,
                  "selectMessage": true,
                  "date": message.date,
                });
              } else if (message.status === "webpage") {
                updateItems({
                  "offsetId": message.offsetId,
                  "webpage": true,
                  "date": message.date,
                });
              } else if (message.status === "limit") {
                addNewEvent({
                  "error": true,
                  "message": renderTime(message.date) + "  " + message.offsetId + " : " + message.operate + " - " + message.message,
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
            default:
              console.log("未知消息");
          }
        }
      } else {
        addNewEvent({
          "error": message.error,
          "message": renderTime(message.date) + (message.step ? "  (" + message.step + ")" : " ") + message.operate + " - " + message.message,
        });
      }
    }
  }, [addNewEvent, renderTime, setRowData, setClearGridBtnDisabled, addItems, updateInsert, updateItems, updateSelect, isCompressChecked]);

  const setTime = useCallback(() => {
    clearTimeout(timeOut.current);
    timeOut.current = setTimeout(function() {
      if (over.current === false) {
        addNewEvent({
          "error": true,
          "message": renderTime(Date.now()) + "  >>> 过了2分钟都没有收到任何消息",
        });
        if (ws.current && ws.current.readyState === WebSocket.OPEN) {
          ws.current.send(JSON.stringify({
            "command": "close",
          }));
          ws.current.close();
          // closeHandler();
        }
      } else {
        //console.log("停止采集，不再继续send");  //测试
        addNewEvent({
          "error": true,
          "message": renderTime(Date.now()) + "  >>> 停止采集，不再继续send",
        });
      }
    }, 120000);
 }, [addNewEvent, renderTime]);

  const collectWS = useCallback((command) => {
    //const url = "wss://workers1.19425.xyz/ws";  //测试
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
            // closeHandler();
          }
          // waitReconnect(JSON.stringify({
          //   "command": "start",
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
      closeHandler();
      if (over.current === false) {
        waitReconnect(JSON.stringify({
          "command": "start",
        }), waitTime.current);
      }
    })

  }, [addNewEvent, renderTime, handleBeforeUnload, parseMessage, setTime, closeHandler, waitReconnect]);


  waitReconnect = useCallback((command, time) => {
    setTimeout(function() {
      if (over.current === false) {
        btnEnableHandler();
        //console.log("连接远程websocket");  //测试
        addNewEvent({
          "message": renderTime(Date.now()) + "  >>> 连接远程websocket",
        });
        try {
          collectWS(command);
        } catch (e) {
          btnUnableHandler();
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
  }, [addNewEvent, renderTime, btnEnableHandler, collectWS, btnUnableHandler, waitReconnect]);

  const messageErrorHandler = useCallback((message) => {
    addNewEvent({
      "error": true,
      "message": renderTime(Date.now()) + message,
    });
  }, [addNewEvent, renderTime]);

  const pauseBtnClickHandler = useCallback(() => {
    //console.log(pauseBtnText);  //测试
    if (pauseBtnText === "暂停") {
      setPauseBtnText("开始");
      btnHandler(true);
      //console.log(ws.current);  //测试
      if (ws.current && ws.current.readyState === WebSocket.OPEN) {
        try {
          ws.current.send(JSON.stringify({
            "command": "pause",
          }));
        } catch (e) {
          // console.log(e);  //测试
          btnEnableHandler();
          messageErrorHandler("  >>> pause失败");
        }
      } else {
        btnEnableHandler();
        messageErrorHandler("  >>> 没有连接ws");
      }
    } else if (pauseBtnText === "开始") {
      setPauseBtnText("暂停");
      btnHandler(false);
      if (!ws.current || ws.current.readyState !== WebSocket.OPEN) {
        waitReconnect(JSON.stringify({
          "command": "start",
        }), 1000);
      }
    }
  }, [setPauseBtnText, btnHandler, btnEnableHandler, messageErrorHandler, waitReconnect, pauseBtnText]);

  const collectBtnClickHandler = useCallback(() => {
    btnUnableHandler();
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      try {
        ws.current.close();
        // closeHandler();
      } catch (e) {
        // console.log(e);  //测试
        btnEnableHandler();
        messageErrorHandler("  >>> collect失败");
      }
    } else {
      btnEnableHandler();
      messageErrorHandler("  >>> 没有连接ws");
    }
  }, [btnUnableHandler, btnEnableHandler, messageErrorHandler]);

  const closeBtnClickHandler = useCallback(() => {
    btnUnableHandler();
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      try {
        ws.current.send(JSON.stringify({
          "command": "close",
        }));
      } catch (e) {
        // console.log(e);  //测试
        btnEnableHandler();
        messageErrorHandler("  >>> close失败");
      }
    } else {
      btnEnableHandler();
      messageErrorHandler("  >>> 没有连接ws");
    }
  }, [btnUnableHandler, btnEnableHandler, messageErrorHandler]);

  const nextBtnClickHandler = useCallback(() => {
    setNextBtnDisabled(true);
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      try {
        ws.current.send(JSON.stringify({
          "command": "over",
        }));
      } catch (e) {
        // console.log(e);  //测试
        messageErrorHandler("  >>> next失败");
        setNextBtnDisabled(false);
      }
    } else {
      messageErrorHandler("  >>> 没有连接ws");
      setNextBtnDisabled(false);
    }
  }, [setNextBtnDisabled, messageErrorHandler]);

  const chatBtnClickHandler = useCallback(() => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      try {
        ws.current.send(JSON.stringify({
          "command": "chat",
        }));
      } catch (e) {
        // console.log(e);  //测试
        messageErrorHandler("  >>> chat失败");
      }
    } else {
      waitReconnect(JSON.stringify({
        "command": "chat",
      }), 1000);
    }
  }, [messageErrorHandler, waitReconnect]);

  const cacheBtnClickHandler = useCallback(() => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      try {
        ws.current.send(JSON.stringify({
          "command": "cache",
        }));
      } catch (e) {
        // console.log(e);  //测试
        messageErrorHandler("  >>> cache失败");
      }
    } else {
      waitReconnect(JSON.stringify({
        "command": "cache",
      }), 1000);
    }
  }, [messageErrorHandler, waitReconnect]);

  const clearCacheBtnClickHandler = useCallback(() => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      try {
        ws.current.send(JSON.stringify({
          "command": "clear",
        }));
      } catch (e) {
        // console.log(e);  //测试
        messageErrorHandler("  >>> clear失败");
      }
    } else {
      messageErrorHandler("  >>> 没有连接ws");
    }
  }, [messageErrorHandler]);

  const clearGridBtnClickHandler = useCallback(() => {
    lastId.current = 0;
    lastRow.current = null;
    setRowData([]);
    setClearGridBtnDisabled(true);
  }, [setRowData, setClearGridBtnDisabled]);

  const clearLogBtnClickHandler = useCallback(() => {
    setLogData(() => {
      return [];
    });
    setClearLogBtnDisabled(true);
  }, [setLogData, setClearLogBtnDisabled]);

  const compressChangeHandler = useCallback(() => {
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
        messageErrorHandler("  >>> compress失败");
        setCompressChecked(isCompress);
      }
    }
  }, [setCompressChecked, messageErrorHandler, isCompressChecked]);

  const batchChangeHandler = useCallback(() => {
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
        messageErrorHandler("  >>> batch失败");
        setBatchChecked(isBatch);
      }
    }
  }, [setBatchChecked, messageErrorHandler, isBatchChecked]);

  const inputHandleChange = useCallback((e) => {
    setInputValue(e.target.value);
  }, [setInputValue]);

  const sendBtnClickHandler = useCallback(() => {
    setSendBtnDisabled(true);
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      try {
        ws.current.send(JSON.stringify({
          "command": inputValue,
        }));
        setInputValue("");
      } catch (e) {
        // console.log(e);  //测试
        messageErrorHandler("  >>> send失败");
        setSendBtnDisabled(false);
      }
    } else {
      // messageErrorHandler("  >>> 没有连接ws");
      // setSendBtnDisabled(false);
      waitReconnect(inputValue, 1000);
    }
  }, [setSendBtnDisabled, setInputValue, messageErrorHandler, waitReconnect, inputValue]);

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
      <div style={{ height: "100%", margin: "1px", display: "flex", flexDirection: "column" }}>
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
        <div style={{ margin: "1px" }}>
          <button onClick={pauseBtnClickHandler}>{pauseBtnText}</button>
          <button onClick={collectBtnClickHandler} disabled={isCollectBtnDisabled}>断开</button>
          <button onClick={closeBtnClickHandler} disabled={isCloseBtnDisabled}>强制关闭</button>
          <button onClick={nextBtnClickHandler} disabled={isNextBtnDisabled}>不再继续</button>
          <button onClick={chatBtnClickHandler}>chat</button>
          <button onClick={cacheBtnClickHandler}>cache</button>
          <button onClick={clearCacheBtnClickHandler}>清空cache</button>
          <button onClick={clearGridBtnClickHandler} disabled={isClearGridBtnDisabled}>清空grid</button>
          <button onClick={clearLogBtnClickHandler} disabled={isClearLogBtnDisabled}>清空log</button>
          <label>
            <input type="checkbox" checked={isCompressChecked} onChange={compressChangeHandler} />
            压缩
          </label>
          <label>
            <input type="checkbox" checked={isBatchChecked} onChange={batchChangeHandler} />
            批量
          </label>
          <input type="text" value={inputValue} onChange={inputHandleChange} />
          <button onClick={sendBtnClickHandler} disabled={isSendBtnDisabled}>发送</button>
        </div>
        <div style={{ height: "20%", margin: "1px",  }}>
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
