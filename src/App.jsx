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
  const rowArray = useRef({});
  const ws = useRef(null);
  const stop = useRef(false);
  const over = useRef(false);
  const timeOut = useRef(null);
  const gridRef = useRef(null);
  const errorCount = useRef(0);
  const waitTime = useRef(30000);
  const containerStyle = useMemo(() => ({ width: "100%", height: "100%", margin: "1px" }), []);
  const gridStyle = useMemo(() => ({ width: "100%", height: "100%", margin: "1px" }), []);
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
  const getRowId = useCallback((params) => String(params.data.chatId), []);

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
            field: "clientId",
            headerName: "clientId",
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
          //   field: "messageId",
          //   headerName:"messageId",
          //   columnGroupShow: "open",
          // },
        ],
      },
      {
        headerName: "status",
        groupId: "status",
        openByDefault: true,
        children: [
          {
            field: "forward",
            headerName: "forward",
            columnGroupShow: "open",
          },
          {
            field: "messageLength",
            headerName: "messageLength",
            columnGroupShow: "open",
          },
          {
            field: "error",
            headerName: "error",
            columnGroupShow: "open",
          },
          {
            field: "date",
            headerName: "date",
            columnGroupShow: "open",
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

  // const rowClassRules = useMemo(() => {
  //   let chatId = 0;
  //   gridRef.current.api.forEachNode(function (node) {
  //     chatId = node.data.chatId;
  //     return;
  //   });
  //   return {
  //     "rag-red": params => stop.current === true && params.node.data.chatId === chatId,
  //   };
  // }, []);

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
      rowArray.current = {};
      setRowData([]);
      setClearGridBtnDisabled(true);
      console.log("删除grid成功");  //测试
    }
    //console.log(items);  //测试
    if (rowArray.current[items.chatId]) {
      console.log(items.chatId + " : 已添加过该row了");
      addNewEvent({
        "message": renderTime(Date.now()) + "  >>> " + items.chatId + "已添加过该row了",
      });
    } else {
      const res = gridRef.current.api.applyTransaction({
        add: [items],
        addIndex: 0,
      });
      //console.log(res);  //测试
      if (res.add && res.add.length > 0) {
        rowArray.current[items.chatId] = res.add[0];
        // console.log(items.chatId + " : 添加row成功");
        // addNewEvent({
        //   "message": renderTime(Date.now()) + "  >>> " + items.chatId + " : 添加row成功",
        // });
      } else {
        console.log(items.chatId + " : 添加row失败");
        addNewEvent({
          "message": renderTime(Date.now()) + "  >>> " + items.chatId + " : 添加row失败",
        });
        //console.log(items);  //测试
      }
      if (gridRef.current.api.getDisplayedRowCount() === 0) {
        setClearGridBtnDisabled(true);
      } else {
        setClearGridBtnDisabled(false);
      }
    }
  }, [addNewEvent, renderTime, setRowData, setClearGridBtnDisabled]);

  const deleteItems = useCallback((items) => {
    const res = gridRef.current.api.applyTransaction({
      remove: [items],
    });
    //console.log(res);  //测试
    if (res.remove && res.add.remove > 0) {
      delete rowArray.current[items.chatId];
      //console.log("删除row成功");
      // addNewEvent({
      //   "message": renderTime(Date.now()) + "  >>> " + items.chatId + " : 删除row成功",
      // });
    } else {
      console.log(items.chatId + " : 删除row失败");
      addNewEvent({
        "message": renderTime(Date.now()) + "  >>> " + items.chatId + " : 删除row失败",
      });
    }
  }, [addNewEvent, renderTime]);

  const updateRow = useCallback((rowNode, items) => {
    if (rowNode.data.forward && rowNode.data.forward > 0) {
      if (items.messageLength && items.messageLength > 0) {
        rowNode.data.forward += items.messageLength;
      }
    } else {
      if (items.messageLength && items.messageLength > 0) {
        rowNode.data.forward = items.messageLength;
      }
    }
    for (const name in items) {
      //console.log(name);  //测试
      //console.log(items[name]);  //测试
      if (name === "error") {
        if (items[name] === true) {
          if (rowNode.data.error > 0) {
            rowNode.setDataValue("error", rowNode.data.error + 1);
          } else {
            rowNode.setDataValue("error", 1);
          }
        }
      } else {
        rowNode.setDataValue(name, items[name]);
      }
    }
  }, []);

  const updateItems = useCallback((data) => {
    const {chatId, ...items} = data;
    if (rowArray.current[chatId]) {
      updateRow(rowArray.current[chatId], items);
    } else {
      let found = false;
      // gridRef.current.api.forEachNodeAfterFilterAndSort((rowNode, index) => {
      gridRef.current.api.forEachNode((rowNode, index) => {
        if (rowNode.data.chatId === chatId) {
          if (items.clientCount && items.clientCount > 0 && index > items.clientCount) {
            deleteItems(rowNode);
            addItems(rowNode);
          }
          updateRow(rowNode, items);
          found = true;
          return;
        }
      });
      if (found === false) {
        console.log(chatId + " : 查找row失败");
        addNewEvent({
          "error": true,
          "message": renderTime(Date.now()) + "  >>> " + chatId + " : 查找row失败",
        });
      // } else {
      //   addItems(data);
      }
    }
  }, [addNewEvent, renderTime, deleteItems, addItems, updateRow]);

  // const handleBeforeUnload = useCallback((event) => {
  //   event.preventDefault();
  //   event.returnValue = '程序正在运行中，确定要关闭吗？';
  // }, []);

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
    // window.removeEventListener('beforeunload', handleBeforeUnload);
    // window.removeEventListener('popstate', handleBeforeUnload);
    // let rowNode = null;
    // gridRef.current.api.forEachNode(function (node) {
    //   rowNode = node;
    //   return;
    // });
    // if (rowNode) {
    //   gridRef.current.api.redrawRows({
    //     rowNodes: [rowNode],
    //   });
    // }
    btnUnableHandler();
    // setLogData(() => {
    //   return [];
    // });
    //console.log("远程websocket连续" + errorCount.current + "次断开了连接");  //测试
    addNewEvent({
      "error": true,
      "message": renderTime(Date.now()) + "  >>> 远程websocket连续" + errorCount.current + "次断开了连接",
    });
  }, [addNewEvent, renderTime, btnUnableHandler]);

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
      // rowArray.current = {};
      // setRowData([]);
      // setClearGridBtnDisabled(true);
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
      clearTimeout(timeOut.current);
      //console.log("全部chat采集完毕");  //测试
      addNewEvent({
        // "message": renderTime(Date.now()) + "  >>>全部chat采集完毕",
        "message": renderTime(message.date) + "  " + message.operate + " - " + message.message,
      });
    } else {
      if (message.clientId && message.clientId > 0 && message.chatId && message.chatId >= 0) {
        switch (message.operate) {
          case "forwardMessage":
            if (message.status === "update") {
              //delete message.operate;
              //delete message.status;
              const {
                operate,
                status,
                ...temp
              } = message;
              updateItems(temp);
            } else if (message.status === "error") {
              updateItems({
                "chatId": message.chatId,
                "date": message.date,
              });
              addNewEvent({
                "error": true,
                "message": renderTime(message.date) + "  " + (message.step ? "  (" + message.step + ")" : " ") + " " + (message.clientId ? "  [" + message.clientCount + "|" + message.clientId + "]" : " ") + " : " + message.operate + " - " + message.message,
              });
            } else if (message.status === "wait") {
              addNewEvent({
                "error": true,
                "message": renderTime(message.date) + "  " + (message.step ? "  (" + message.step + ")" : " ") + " " + (message.clientId ? "  [" + message.clientCount + "|" + message.clientId + "]" : " ") + " : " + message.operate + " - " + message.message,
              });
            } else {
              //console.log("未知消息");
              addNewEvent({
                "error": message.error,
                "message": renderTime(message.date) + "  " + (message.step ? "  (" + message.step + ")" : " ") + " " + (message.clientId ? "  [" + message.clientCount + "|" + message.clientId + "]" : " ") + " : " + message.operate + " - " + message.message,
              });
            }
            break;
          case "checkChat":
            if (message.status === "add") {
              const {
                operate,
                status,
                ...temp
              } = message;
              addItems(temp);
            } else {
              //console.log("未知消息");
              addNewEvent({
                "error": message.error,
                "message": renderTime(message.date) + "  " + (message.step ? "  (" + message.step + ")" : " ") + " " + (message.clientId ? "  [" + message.clientCount + "|" + message.clientId + "]" : " ") + " : " + message.operate + " - " + message.message,
              });
            }
            break;
          case "nextChat":
            if (message.status === "add") {
              const {
                operate,
                status,
                ...temp
              } = message;
              addItems(temp);
            } else {
              //console.log("未知消息");
              addNewEvent({
                "error": message.error,
                "message": renderTime(message.date) + "  " + (message.step ? "  (" + message.step + ")" : " ") + " " + (message.clientId ? "  [" + message.clientCount + "|" + message.clientId + "]" : " ") + " : " + message.operate + " - " + message.message,
              });
            }
            break;
          default:
            //console.log("未知消息");
            addNewEvent({
              "error": message.error,
              "message": renderTime(message.date) + "  " + (message.step ? "  (" + message.step + ")" : " ") + " " + (message.clientId ? "  [" + message.clientCount + "|" + message.clientId + "]" : " ") + " : " + message.operate + " - " + message.message,
            });
        }
      } else {
        addNewEvent({
          "error": message.error,
          "message": renderTime(message.date) + "  " + (message.step ? "  (" + message.step + ")" : " ") + " " + (message.clientId ? "  [" + message.clientCount + "|" + message.clientId + "]" : " ") + " : " + message.operate + " - " + message.message,
        });
      }
    }
  }, [addNewEvent, renderTime, addItems, updateItems]);

  const setTime = useCallback(() => {
    clearTimeout(timeOut.current);
    // let time = 120000;
    // let count = 2;
    // if (documentValue === 1) {
    //   time = 60000;
    //   count = 1;
    // }
    let time = 240000;
    timeOut.current = setTimeout(function() {
      if (over.current === false) {
        addNewEvent({
          "error": true,
          // "message": renderTime(Date.now()) + "  >>> 过了" + count + "分钟都没有收到任何消息",
          "message": renderTime(Date.now()) + "  >>> 过了4分钟都没有收到任何消息",
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
    }, time);
 }, [addNewEvent, renderTime]);

  const collectWS = useCallback((command) => {
    // console.log("documentValue : " + documentValue);  //测试
    //const url = "wss://forward.19420.xyz/ws";  //测试
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
      // window.addEventListener('beforeunload', handleBeforeUnload);
      // window.addEventListener('popstate', handleBeforeUnload);
      // let rowNode = null;
      // gridRef.current.api.forEachNode(function (node) {
      //   rowNode = node;
      //   return;
      // });
      // if (rowNode) {
      //   gridRef.current.api.redrawRows({
      //     rowNodes: [rowNode],
      //   });
      // }
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
        // if (data === "ping") {
        //   //console.log("ping");  //测试
        // } else {
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
        // }
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
        // console.log(documentValue);  //测试
        waitReconnect(JSON.stringify({
          "command": "start",
          "filterType": documentValue,
        }), waitTime.current);
      }
    })

  }, [addNewEvent, renderTime, parseMessage, setTime, closeHandler, waitReconnect, documentValue]);

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

  const radioChangeHandler = useCallback((e) => {
    // console.log(parseInt(e.target.value));  //测试
    setDocumentValue(parseInt(e.target.value));
  }, [setDocumentValue]);

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
      // console.log(documentValue);  //测试
      setPauseBtnText("暂停");
      btnHandler(false);
      if (!ws.current || ws.current.readyState !== WebSocket.OPEN) {
        waitReconnect(JSON.stringify({
          "command": "start",
          "filterType": documentValue,
        }), 1000);
      }
    }
  }, [setPauseBtnText, btnHandler, btnEnableHandler, messageErrorHandler, waitReconnect, pauseBtnText, documentValue]);

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
    rowArray.current = {};
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
  //   } else if (rowData.length >= 100) {
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
            // rowClassRules={rowClassRules}
            rowSelection={rowSelection}
            pagination={pagination}
            paginationPageSize={paginationPageSize}
            paginationPageSizeSelector={paginationPageSizeSelector}
          />
        </div>
        <div style={{ margin: "1px" }}>
          <label>
            <input type="radio" name="filterType" value="0" checked={documentValue === 0} onChange={radioChangeHandler} />
            媒体
          </label>
          <label>
            <input type="radio" name="filterType" value="1" checked={documentValue === 1} onChange={radioChangeHandler} />
            图片
          </label>
          <label>
            <input type="radio" name="filterType" value="2" checked={documentValue === 2} onChange={radioChangeHandler} />
            视频
          </label>
          <label>
            <input type="radio" name="filterType" value="3" checked={documentValue === 3} onChange={radioChangeHandler} />
            文档
          </label>
          <label>
            <input type="radio" name="filterType" value="4" checked={documentValue === 4} onChange={radioChangeHandler} />
            动图
          </label>
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
