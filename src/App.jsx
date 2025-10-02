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
  let collectWS = null;
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
            field: "selectMessage",
            headerName: "selectMessage",
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
    // if (logData.length >= 200) {
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
      return [newItem, ...prevState];
    });
    // if (logData.length === 0) {
    //   setClearLogBtnDisabled(true);
    // } else {
    //   setClearLogBtnDisabled(false);
    // }
  }, []);

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
        "key": ++key,
        "message": renderTime(Date.now()) + "  >>> 添加row失败",
      });
      //console.log(newItems);  //测试
    }
    if (gridRef.current.api.getDisplayedRowCount() === 0) {
      setClearGridBtnDisabled(true);
    } else {
      setClearGridBtnDisabled(false);
    }
  }, [addNewEvent, renderTime, key]);

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
        "key": ++key,
        "error": true,
        "message": renderTime(Date.now()) + "  >>> lastRow错误",
      });
    }
  }, [addNewEvent, updateLastRow, renderTime, key]);

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
  }, [getLastRow, updateLastRow]);

  const updateSelect = useCallback((message, name) => {
    if (message.status === "try") {
      updateItems({
        "offsetId": message.offsetId,
        [name]: false,
        "error": true,
        "date": message.date,
      });
      addNewEvent({
        "key": ++key,
        "error": true,
        "message": renderTime(message.date) + "  " + message.offsetId + " : " + message.operate + " - " + message.message,
      });
    } else {
      console.log("未知消息");
    }
  }, [addNewEvent, renderTime, updateItems, key]);

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
        "key": ++key,
        "error": true,
        "message": renderTime(message.date) + "  " + message.offsetId + " : " + message.operate + " - " + message.message,
      });
    } else if (message.status === "try") {
      addNewEvent({
        "key": ++key,
        "error": true,
        "message": renderTime(message.date) + "  " + message.offsetId + " : " + message.operate + " - " + message.message,
      });
    } else {
      console.log("未知消息");
    }
  }, [addNewEvent, renderTime, updateItems, key]);

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
  // }, [btnHandler, pauseBtnText]);
  }, [btnHandler]);

  const btnEnableHandler = useCallback(() => {
    btnHandler(false);
    // // if (pauseBtnText === "开始") {
    // if (pauseBtnText !== "暂停") {
      setPauseBtnText("暂停");
    // }
  // }, [btnHandler, pauseBtnText]);
  }, [btnHandler]);

  const closeHandler = useCallback(() => {
    ws.current = null;
    stop.current = true;
    window.removeEventListener('beforeunload', handleBeforeUnload);
    window.removeEventListener('popstate', handleBeforeUnload);
    if (lastRow.current) {
      gridRef.current.api.redrawRows({
        rowNodes: [lastRow.current],
      });
    }
    btnUnableHandler();
    // setLogData((prevState) => {
    //   return [];
    // });
    //console.log("远程websocket断开了连接");  //测试
    addNewEvent({
      "key": ++key,
      "error": true,
      "message": renderTime(Date.now()) + "  >>> 远程websocket断开了连接",
    });
  }, [addNewEvent, renderTime, handleBeforeUnload, btnUnableHandler, key]);

  const parseMessage = useCallback((message) => {
    if (message.result === "pause") {
      //console.log("远程websocket已停止完毕");  //测试
      addNewEvent({
        "key": ++key,
        "error": true,
        "message": renderTime(Date.now()) + "  >>> 远程websocket已停止完毕",
      });
      ws.current.close();
      closeHandler();
    } else if (message.result === "end") {
      lastId.current = 0;
      lastRow.current = null;
      setRowData([]);
      setClearGridBtnDisabled(true);
      setLogData(() => {
        return [];
      });
      setClearLogBtnDisabled(true);
      //console.log("当前chat采集完毕");  //测试
      addNewEvent({
        "key": ++key,
        "message": renderTime(Date.now()) + "  >>>当前chat采集完毕",
      });
    } else if (message.result === "over") {
      over.current = true;
      //console.log("全部chat采集完毕");  //测试
      addNewEvent({
        "key": ++key,
        "message": renderTime(Date.now()) + "  >>>全部chat采集完毕",
      });
    } else {
      if (message.offsetId && message.offsetId >= 0) {
        if (message.offsetId < lastId.current) {
          console.log("消息offsetId小了");
          addNewEvent({
            "key": ++key,
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
                  "key": ++key,
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
                  "key": ++key,
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
          "key": ++key,
          "error": message.error,
          "message": renderTime(message.date) + (message.step ? "  (" + message.step + ")" : " ") + message.operate + " - " + message.message,
        });
      }
    }
  }, [addNewEvent, addItems, renderTime, updateInsert, updateItems, updateSelect, closeHandler, isCompressChecked, key]);

  const waitReconnect = useCallback((command, time) => {
    setTimeout(function() {
      btnEnableHandler();
      //console.log("连接远程websocket");  //测试
      addNewEvent({
        "key": ++key,
        "message": renderTime(Date.now()) + "  >>> 连接远程websocket",
      });
      try {
        collectWS(command);
      } catch (e) {
        btnUnableHandler();
        //console.log("连接远程websocket失败");  //测试
        addNewEvent({
          "key": ++key,
          "error": true,
          "message": renderTime(Date.now()) + "  >>> 连接远程websocket失败",
        });
        waitReconnect(command, time);
      }
    }, time);
  }, [addNewEvent, renderTime, btnEnableHandler, btnUnableHandler, collectWS, key]);

  collectWS = useCallback((command) => {
    //const url = "wss://workers.19425.xyz/ws";  //测试
    const url = new URL(window.location);
    url.protocol = "wss";
    url.pathname = "/ws";
    ws.current = new WebSocket(url);
    if (!ws.current) {
      throw new Error("  >>> 连接远程websocket失败");
    }

    ws.current.addEventListener("open", () => {
      stop.current = false;
      //console.log("连接远程websocket成功，准备send");  //测试
      addNewEvent({
        "key": ++key,
        "message": renderTime(Date.now()) + "  >>> 连接远程websocket成功，准备send",
      });
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
        } catch (e) {
          console.log(e);  //测试
          addNewEvent({
            "key": ++key,
            "error": true,
            "message": renderTime(Date.now()) + "  >>> send失败",
          });
          if (ws.current && ws.current.readyState === WebSocket.OPEN) {
            ws.current.close();
            closeHandler();
          }
          //waitReconnect("start", 20000);
        }
      } else {
        //console.log(command + "失败");  //测试
        addNewEvent({
          "key": ++key,
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
            "key": ++key,
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
            "key": ++key,
            "error": true,
            "message": renderTime(Date.now()) + "  >>> message错误",
          });
        }
      } else {
        console.log("消息为空");
        addNewEvent({
          "key": ++key,
          "error": true,
          "message": renderTime(Date.now()) + "  >>> 消息为空",
        });
      }
      clearTimeout(timeOut.current);
      timeOut.current = setTimeout(function() {
        addNewEvent({
          "key": ++key,
          "error": true,
          "message": renderTime(Date.now()) + "  >>> 过了2分钟都没有收到任何消息",
        });
        if (ws.current && ws.current.readyState === WebSocket.OPEN) {
          ws.current.send("close");
          ws.current.close();
          closeHandler();
        }
      }, 120000);
    })

    ws.current.addEventListener("close", () => {
      closeHandler();
      if (over.current === false) {
        waitReconnect("start", 30000);
      }
    })

  }, [addNewEvent, renderTime, handleBeforeUnload, waitReconnect, parseMessage, closeHandler, key]);

  const messageErrorHandler = useCallback((message) => {
    addNewEvent({
      "key": ++key,
      "error": true,
      "message": renderTime(Date.now()) + message,
    });
  }, [addNewEvent, renderTime, key]);

  const pauseBtnClickHandler = useCallback(() => {
    //console.log(pauseBtnText);  //测试
    if (pauseBtnText === "暂停") {
      setPauseBtnText("开始");
      btnHandler(true);
      //console.log(ws.current);  //测试
      if (ws.current && ws.current.readyState === WebSocket.OPEN) {
        try {
          ws.current.send("pause");
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
        waitReconnect("start", 1000);
      }
    }
  }, [btnHandler, btnEnableHandler, messageErrorHandler, waitReconnect, pauseBtnText]);

  const collectBtnClickHandler = useCallback(() => {
    btnUnableHandler();
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      try {
        ws.current.close();
        closeHandler();
      } catch (e) {
        // console.log(e);  //测试
        btnEnableHandler();
        messageErrorHandler("  >>> collect失败");
      }
    } else {
      btnEnableHandler();
      messageErrorHandler("  >>> 没有连接ws");
    }
  }, [btnEnableHandler, btnUnableHandler, messageErrorHandler, closeHandler]);

  const closeBtnClickHandler = useCallback(() => {
    btnUnableHandler();
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      try {
        ws.current.send("close");
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
        ws.current.send("over");
      } catch (e) {
        // console.log(e);  //测试
        messageErrorHandler("  >>> next失败");
        setNextBtnDisabled(false);
      }
    } else {
      messageErrorHandler("  >>> 没有连接ws");
      setNextBtnDisabled(false);
    }
  }, [messageErrorHandler, setNextBtnDisabled]);

  const chatBtnClickHandler = useCallback(() => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      try {
        ws.current.send("chat");
      } catch (e) {
        // console.log(e);  //测试
        messageErrorHandler("  >>> chat失败");
      }
    } else {
      waitReconnect("chat", 1000);
    }
  }, [messageErrorHandler, waitReconnect]);

  const clearCacheBtnClickHandler = useCallback(() => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      try {
        ws.current.send("clear");
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
  }, []);

  const clearLogBtnClickHandler = useCallback(() => {
    setLogData(() => {
      return [];
    });
    setClearLogBtnDisabled(true);
  }, []);

  const compressChangeHandler = useCallback(() => {
    const isCompress = isCompressChecked;
    setCompressChecked(!isCompress);
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      try {
        if (isCompress === true) {
          ws.current.send("noCompress");
        } else if (isCompress === false) {
          ws.current.send("compress");
        }
      } catch (e) {
        // console.log(e);  //测试
        messageErrorHandler("  >>> compress失败");
        setCompressChecked(isCompress);
      }
    }
  }, [messageErrorHandler, setCompressChecked, isCompressChecked]);

  const batchChangeHandler = useCallback(() => {
    const isBatch = isBatchChecked;
    setBatchChecked(!isBatch);
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      try {
        if (isBatch === true) {
          ws.current.send("noBatch");
        } else if (isBatch === false) {
          ws.current.send("batch");
        }
      } catch (e) {
        // console.log(e);  //测试
        messageErrorHandler("  >>> batch失败");
        setBatchChecked(isBatch);
      }
    }
  }, [messageErrorHandler, setBatchChecked, isBatchChecked]);

  // useEffect(() => {
  //   if (rowData.length === 0) {
  //     setClearGridBtnDisabled(true);
  //   } else if (rowData.length >= 200) {
  //     setRowData([]);
  //     setClearGridBtnDisabled(true);
  //     console.log("删除grid成功");  //测试
  //   } else {
  //     setClearGridBtnDisabled(false);
  //   }
  // //    return () => {
  // //    }
  // },[rowData]);

  useEffect(() => {
    if (logData.length === 0) {
      setClearLogBtnDisabled(true);
    } else if (logData.length >= 200) {
      setLogData([]);
      setClearLogBtnDisabled(false);
      console.log("删除log成功");  //测试
    } else {
      setClearLogBtnDisabled(false);
    }
//    return () => {
//    }
  },[logData]);

  // useEffect(() => {
  //   const handleBeforeUnload = (event) => {
  //     //event.preventDefault();
  //     event.returnValue = '程序正在运行，确定要关闭吗？';
  //   };
  //   window.addEventListener('beforeunload', handleBeforeUnload);
  //   return () => {
  //     window.removeEventListener('beforeunload', handleBeforeUnload);
  //   };
  // }, [stop.current]);

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
