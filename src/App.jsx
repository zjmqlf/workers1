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
  ScrollApiModule,
} from "ag-grid-community";
import {
  RowGroupingModule,
} from "ag-grid-enterprise";
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
  RowGroupingModule,
  ScrollApiModule,
]);

const App = () => {
  let key = 0;
  let waitReconnect = null;
  // const pagination = true;
  // const paginationPageSize = 50;
  // const paginationPageSizeSelector = [50, 150, 200];
  const rowArray = useRef({});
  const lastId = useRef({});
  const lastClient = useRef(0);
  const ws = useRef(null);
  const stop = useRef(false);
  const over = useRef(false);
  const timeOut = useRef(null);
  const gridRef = useRef(null);
  const errorCount = useRef(0);
  const waitTime = useRef(30000);
  const containerStyle = useMemo(() => ({ width: "100%", height: "100%" }), []);
  const gridStyle = useMemo(() => ({ width: "65%", height: "95%" }), []);
  const [documentValue, setDocumentValue] = useState(-1);
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

  const renderFilter = useCallback((params) => {
    if (params.node.level === 1) {
      if (params.value && params.value > 0) {
      // const filterArray = {
      //   0: "媒体",
      //   1: "图片",
      //   2: "视频",
      //   3: "文件",
      //   4: "动图",
      // };
      const filterArray = {
        0: "media",
        1: "photo",
        2: "video",
        3: "document",
        4: "gif",
      };
        return filterArray[params.value] ? filterArray[params.value] : "未知";
      } else {
        return "未知";
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
            columnGroupShow: "open",
          },
          // {
          //   field: "clientIndex",
          //   headerName: "clientIndex",
          //   columnGroupShow: "open",
          // },
          {
            field: "clientId",
            headerName: "clientId",
            columnGroupShow: "open",
            rowGroup: true,
            hide: true,
            // minWidth: 20,
            // maxWidth: 20,
          },
          {
            field: "filterType",
            headerName:"filterType",
            columnGroupShow: "open",
            cellRenderer: renderFilter,
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
          // {
          //   field: "error",
          //   headerName: "error",
          //   columnGroupShow: "open",
          // },
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
      height: "40%",
      editable: false,
      enableCellChangeFlash: true,
    };
  }, []);

  const autoGroupColumnDef = useMemo(() => {
    return {
      minWidth: 40,
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
      "rag-red": params => params.node.level === 1 && params.node.data.chatId === lastId.current[params.node.data.clientId] && (!params.node.data.messageLength || params.node.data.messageLength < 100),
    };
  }, []);

  // const onRowDataUpdated = useCallback((event) => {
  //   const rowNodeIndex = event.node?.rowIndex;
  //   // console.log(rowNodeIndex);  //测试
  //   if (rowNodeIndex > 0) {
  //     gridRef.current.api.ensureIndexVisible(rowNodeIndex, 'middle');
  //   }
  // }, []);

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
    if (items.clientId && items.clientId > 0) {
      lastClient.current = items.clientId;
    }
    // if (gridRef.current.api.getDisplayedRowCount() >= 200) {
    //   rowArray.current = {};
    //   setRowData([]);
    //   setClearGridBtnDisabled(true);
    //   console.log("删除grid成功");  //测试
    // }
    //console.log(items);  //测试
    if (rowArray.current[items.chatId]) {
      //console.log(items.chatId + " : 已添加过该row了");
      // addNewEvent({
      //   "message": renderTime(Date.now()) + "  >>> " + items.chatId + "已添加过该row了",
      // });
    } else {
      const res = gridRef.current.api.applyTransaction({
        add: [items],
        addIndex: 0,
      });
      //console.log(res);  //测试
      if (res.add && res.add.length > 0) {
        rowArray.current[items.chatId] = res.add[0];
        if (lastId.current[items.clientId]) {
          if (lastId.current[items.clientId] < items.chatId) {
            lastId.current[items.clientId] = items.chatId;
          }
        } else {
          lastId.current[items.clientId] = items.chatId;
        }
        gridRef.current.api.ensureNodeVisible(rowArray.current[items.chatId], 'middle');
        // gridRef.current.api.ensureIndexVisible(rowArray.current[items.chatId].rowIndex, 'middle');
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
  }, [addNewEvent, renderTime, setClearGridBtnDisabled]);

  // const deleteItems = useCallback((items) => {
  //   const res = gridRef.current.api.applyTransaction({
  //     remove: [items],
  //   });
  //   //console.log(res);  //测试
  //   if (res.remove && res.add.remove > 0) {
  //     delete rowArray.current[items.chatId];
  //     //console.log("删除row成功");
  //     // addNewEvent({
  //     //   "message": renderTime(Date.now()) + "  >>> " + items.chatId + " : 删除row成功",
  //     // });
  //   } else {
  //     console.log(items.chatId + " : 删除row失败");
  //     addNewEvent({
  //       "message": renderTime(Date.now()) + "  >>> " + items.chatId + " : 删除row失败",
  //     });
  //   }
  // }, [addNewEvent, renderTime]);

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
      // if (name === "error") {
      //   if (items[name] === true) {
      //     if (rowNode.data.error > 0) {
      //       rowNode.setDataValue("error", rowNode.data.error + 1);
      //     } else {
      //       rowNode.setDataValue("error", 1);
      //     }
      //   }
      // } else {
        rowNode.setDataValue(name, items[name]);
        gridRef.current.api.ensureNodeVisible(rowNode, 'middle');
        // gridRef.current.api.ensureIndexVisible(rowNode.rowIndex, 'middle');
      // }
    }
  }, []);

  const updateItems = useCallback((data) => {
    const {chatId, ...items} = data;
    if (items.clientId && items.clientId > 0) {
      lastClient.current = items.clientId;
    }
    if (rowArray.current[chatId]) {
      updateRow(rowArray.current[chatId], items);
    } else {
      let found = false;
      // gridRef.current.api.forEachNodeAfterFilterAndSort((rowNode, index) => {
      gridRef.current.api.forEachNode((rowNode, index) => {
        if (rowNode.level === 1) {
          if (rowNode.data.chatId === chatId) {
            // if (items.clientCount && items.clientCount > 0 && index >= items.clientCount) {
            //   deleteItems(rowNode);
            //   addItems(rowNode);
            // }
            updateRow(rowNode, items);
            found = true;
            return;
          }
        }
      });
      if (found === false) {
        //console.log(chatId + " : 查找row失败");
        // addNewEvent({
        //   "error": true,
        //   "message": renderTime(Date.now()) + "  >>> " + chatId + " : 查找row失败",
        // });
        data.forward = data.messageLength;
        addItems(data);
      }
    }
  }, [addItems, updateRow]);

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
      // rowArray.current = {};
      // setRowData([]);
      // setClearGridBtnDisabled(true);
      // setLogData(() => {
      //   return [];
      // });
      // setClearLogBtnDisabled(true);
      //console.log("当前chat采集完毕");  //测试
      addNewEvent({
        "message": renderTime(Date.now()) + "  >>>当前chat采集完毕",
      });
    } else if (message.result === "over") {
      over.current = true;
      clearTimeout(timeOut.current);
      //console.log("全部chat采集完毕");  //测试
      addNewEvent({
        "message": renderTime(Date.now()) + "  >>>全部chat采集完毕",
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
            } else if (message.status === "flood") {
              addNewEvent({
                "error": true,
                "message": renderTime(message.date) + "  " + (message.step ? "  (" + message.step + ")" : " ") + " " + (message.clientId ? "  [" + message.clientCount + "|" + message.clientIndex + "-" + message.clientId + "]" : " ") + " : " + message.operate + " - " + message.message,
              });
            } else if (message.status === "error") {
              updateItems({
                "chatId": message.chatId,
                "date": message.date,
              });
              addNewEvent({
                "error": true,
                "message": renderTime(message.date) + "  " + (message.step ? "  (" + message.step + ")" : " ") + " " + (message.clientId ? "  [" + message.clientCount + "|" + message.clientIndex + "-" + message.clientId + "]" : " ") + " : " + message.operate + " - " + message.message,
              });
            } else if (message.status === "wait") {
              addNewEvent({
                "error": true,
                "message": renderTime(message.date) + "  " + (message.step ? "  (" + message.step + ")" : " ") + " " + (message.clientId ? "  [" + message.clientCount + "|" + message.clientIndex + "-" + message.clientId + "]" : " ") + " : " + message.operate + " - " + message.message,
              });
            } else {
              //console.log("未知消息");
              addNewEvent({
                "error": message.error,
                "message": renderTime(message.date) + "  " + (message.step ? "  (" + message.step + ")" : " ") + " " + (message.clientId ? "  [" + message.clientCount + "|" + message.clientIndex + "-" + message.clientId + "]" : " ") + " : " + message.operate + " - " + message.message,
              });
            }
            break;
          case "getMessage":
            if (message.status === "flood") {
              addNewEvent({
                "error": true,
                "message": renderTime(message.date) + "  " + (message.step ? "  (" + message.step + ")" : " ") + " " + (message.clientId ? "  [" + message.clientCount + "|" + message.clientIndex + "-" + message.clientId + "]" : " ") + " : " + message.operate + " - " + message.message,
              });
            } else {
              //console.log("未知消息");
              addNewEvent({
                "error": message.error,
                "message": renderTime(message.date) + "  " + (message.step ? "  (" + message.step + ")" : " ") + " " + (message.clientId ? "  [" + message.clientCount + "|" + message.clientIndex + "-" + message.clientId + "]" : " ") + " : " + message.operate + " - " + message.message,
              });
            }
            break;
          case "getChat":
          case "nextChat":
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
                "message": renderTime(message.date) + "  " + (message.step ? "  (" + message.step + ")" : " ") + " " + (message.clientId ? "  [" + message.clientCount + "|" + message.clientIndex + "-" + message.clientId + "]" : " ") + " : " + message.operate + " - " + message.message,
              });
            }
            break;
          default:
            //console.log("未知消息");
            addNewEvent({
              "error": message.error,
              "message": renderTime(message.date) + "  " + (message.step ? "  (" + message.step + ")" : " ") + " " + (message.clientId ? "  [" + message.clientCount + "|" + message.clientIndex + "-" + message.clientId + "]" : " ") + " : " + message.operate + " - " + message.message,
            });
        }
      } else {
        addNewEvent({
          "error": message.error,
          "message": renderTime(message.date) + "  " + (message.step ? "  (" + message.step + ")" : " ") + " " + (message.clientId ? "  [" + message.clientCount + "|" + message.clientIndex + "-" + message.clientId + "]" : " ") + " : " + message.operate + " - " + message.message,
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
      window.addEventListener('beforeunload', handleBeforeUnload);
      window.addEventListener('popstate', handleBeforeUnload);
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
        if (data === "ping") {
          // console.log("ping");  //测试
        } else {
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
        if (lastClient.current > 0) {
          waitTime.current = 180000 - (lastClient.current * 2000);
        }
        if (waitTime.current < 30000) {
          waitTime.current = 30000;
        }
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
    rowArray.current = {};
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
    } else if (logData.length >= 200) {
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
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "row" }}>
        <div style={gridStyle}>
          <AgGridReact
            ref={gridRef}
            rowData={rowData}
            columnDefs={colDefs}
            defaultColDef={defaultColDef}
            getRowId={getRowId}
            rowClassRules={rowClassRules}
            rowSelection={rowSelection}
            // onRowDataUpdated={onRowDataUpdated}
            // pagination={pagination}
            // paginationPageSize={paginationPageSize}
            // paginationPageSizeSelector={paginationPageSizeSelector}
            autoGroupColumnDef={autoGroupColumnDef}
            groupDefaultExpanded={1}
          />
          <div style={{ width: "100%", height: "5%" }}>
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
        </div>
        <div style={{ width: "35%", height: "100%", minHeight: 0, flexGrow: 1, overflow: "auto" }}>
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
