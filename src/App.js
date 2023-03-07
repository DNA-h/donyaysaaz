import './App.css';
import './styles.css'
import React, { useState, useEffect } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import Modal from 'react-bootstrap/Modal';
import Button from 'react-bootstrap/Button';
import Dropdown from 'react-bootstrap/Dropdown';
import moment from 'moment';
import { Scatter } from 'react-chartjs-2';
import Cookies from 'js-cookie';

let newItemMode = '';
let duplicateLinks = [];
let autoRefreshInterval;
let divarAutoRefresh;
let audio;

function App() {

  const [showProductModal, changeModal] = useState(false);
  const [autoRefresh, updateAutoRefresh] = useState(false);
  const [playSound, updatePlaySound] = useState(false);
  const [search, seachChange] = useState('');
  const [products, updateProducts] = useState([]);
  const [errorItems, updateErrorItems] = useState([]);
  const [errorMode, updateErrorMode] = useState('');
  const [errorsModal, updateErrorsModal] = useState(false);
  const [showLinkHistory, updateShowHistoryLink] = useState(false);
  const [linkHistory, updateLinkHistory] = useState({ history: [] });
  const [queryOption, updateQueryOption] = useState({
    'increase': false, 'decrease': false, 'in_stock': false, 'out_of_stock': false,
    'page': 0, 'pageSize': 18, 'sort_by': 0
  })
  const [lastCrawl, updateLastCrawl] = useState({
    'lastCrawlStarted': '', 'lastCrawlEnded': '', 'lastCrawlChanges': '', 'total': 0,
    'phoneNumberLastTime': '', 'phoneNumberLatest': '', 'phoneNumberTotal': 0,
  })
  const [deleteItemModal, updateDeleteItemModal] = useState(false);
  const [showNewItemModal, changeNewItemModal] = useState(false);
  const [newItemName, updateNewItemName] = useState('')
  const [newItemUrl, updateNewItemUrl] = useState('')
  const [newItemImage, updateNewItemImage] = useState('')
  const [showDivarPhoneNumberModal, changeDivarPhoneNumberModal] = useState(false);
  const [divarPhoneNumber, changeDivarPhoneNumber] = useState('')
  const [showDivarCodeModal, changeDivarCodeModal] = useState(false);
  const [divarCode, changeDivarCode] = useState('')
  const [currentItem, updateCurrentItem] = useState(undefined);
  const [showNewLinkInput, updateNewLinkInput] = useState(false);
  const [newLinkUrl, updateNewLinkUrl] = useState('');
  const [editLinkUrl, updateEditLinkUrl] = useState('');
  const [editLinkPosition, updateEditLinkPosition] = useState(-1);
  const [runPricePosition, updateRunPricePosition] = useState(-1);
  const [warningModal, updateWarningModal] = useState(false);
  const [duplicateModal, updateDuplicateModal] = useState(false);
  const [password, updatePassword] = useState('');
  const importance = ['غیرفعال', '25%', '50%', '75%', 'همیشه']
  // const serverURL = "http://192.168.1.122:8000/";
  const serverURL = "http://127.0.0.1:8000/";

  useEffect(() => {
    reloadItems()
  }, []);

  useEffect(() => {
    if (autoRefresh) {
      clearInterval(autoRefreshInterval);
      autoRefreshInterval = setInterval(reloadItems, 300000);
    }
  }
    , [playSound, autoRefresh])

  useEffect(reloadItems, [queryOption])

  async function notworkRequest(url, body) {
    let headers = [];
    headers = {
      "Content-Type": "application/json",
      'Access-Control-Allow-Origin': '*',
      'X-CSRFToken': Cookies.get('csrftoken'),
    };

    let res = await fetch(
      `${serverURL}${url}/`, {
      method: 'POST',
      body: body ? JSON.stringify(body) : null,
      headers: headers
    })
    let json = await res.json();
    return json;
  }

  async function reloadItems() {
    let json = await notworkRequest('items', {
      method: 'list',
      increase: queryOption.increase,
      decrease: queryOption.decrease,
      out_of_stock: queryOption.out_of_stock,
      in_stock: queryOption.in_stock,
      sort_type: queryOption.sort_by,
      page: queryOption.page,
      pageSize: queryOption.pageSize
    });
    console.log('json', json);
    updateLastCrawl({
      'lastCrawlStarted': json.lastCrawlStarted,
      'lastCrawlEnded': json.lastCrawlEnded,
      'lastCrawlChanges': json.lastCrawlChanges,
      'phoneNumberLastTime': json.phoneNumberLastTime,
      'phoneNumberLatest': json.phoneNumberLatest,
      'phoneNumberTotal': json.phoneNumberTotal,
      'total': json.total
    });
    if (json.list.reduce((n, x) => n + (x.decrease > 0), 0) > 0 && playSound) {
      audio.play()
    }
    updateProducts(json.list);
  }

  async function addNewItem() {
    await notworkRequest('items', {
      method: 'create',
      name: newItemName,
      url: newItemUrl,
      image: newItemImage
    });
    changeNewItemModal(false);
    updateNewItemImage('');
    updateNewItemUrl('');
    updateNewItemName('');
    reloadItems();
  }

  async function send_divarPhoneNumber() {
    await notworkRequest('divar_PhoneNumber', {
      number: divarPhoneNumber,
    });
    changeDivarPhoneNumberModal(false)
    clearInterval(divarAutoRefresh);
    divarAutoRefresh = setInterval(reloadItems, 3000);
    runDivar()
    changeDivarCodeModal(true)
  }

  async function send_divarCode() {
    await notworkRequest('divar_Code', {
      number: divarCode,
    });
    changeDivarCodeModal(false)
    clearInterval(divarAutoRefresh);
  }

  async function updateItem() {
    await notworkRequest('items', {
      method: 'update',
      pk: currentItem.pk,
      name: newItemName,
      url: newItemUrl,
      image: newItemImage
    });
    updateNewItemImage('');
    updateNewItemUrl('');
    updateNewItemName('');
    changeNewItemModal(false);
    if (newItemMode === 'create') {
      reloadItems();
    } else if (newItemMode === 'update') {
      getProduct(currentItem.pk);
    }
  }

  async function updateItemActive() {
    await notworkRequest('items', {
      method: 'toggle',
      pk: currentItem.pk,
      is_active: !currentItem.is_active,
    });
    getProduct(currentItem.pk);
    reloadItems();
  }

  async function updateLinkImportance(importance, index) {
    await notworkRequest('links', {
      method: 'update',
      pk: currentItem.links[index].pk,
      importance
    });
    getProduct(currentItem.pk);
  }

  async function seenItem() {
    await notworkRequest('items', {
      method: 'seen',
      pk: currentItem.pk,
    });
    changeModal(false);
    reloadItems();
  }

  async function getProduct(pk) {
    let json = await notworkRequest('items', {
      method: 'get',
      pk: pk,
    });
    updateCurrentItem(json.item);
    changeModal(true);
  }

  async function getErrors(mode) {
    let json = await notworkRequest('items', {
      method: 'errors',
      mode: mode
    });
    updateErrorItems(json.list);
  }

  async function runTestLink(link) {
    let json = await notworkRequest('run_test_link', {
      link: link,
    });
    updateRunPricePosition(-1);
    alert(' قیمت خوانده شده از لینک' + json.price);
  }

  async function deleteProduct() {
    await notworkRequest('items', {
      method: 'delete',
      pk: currentItem.pk,
    });
    reloadItems();
    updateCurrentItem(undefined);
  }

  async function addLink() {
    await notworkRequest('links', {
      method: 'create',
      url: newLinkUrl,
      parent: currentItem.pk
    });
    getProduct(currentItem.pk);
    updateNewLinkUrl('');
    updateNewLinkInput(false);
  }

  async function updateLink() {
    await notworkRequest('links', {
      method: 'update',
      url: editLinkUrl,
      pk: currentItem.links[editLinkPosition].pk,
    });
    getProduct(currentItem.pk);
    updateEditLinkUrl('');
    updateEditLinkPosition(-1);
  }

  async function updateLinkReported(position) {
    await notworkRequest('links', {
      method: 'update',
      pk: currentItem.links[position].pk,
      reported: !currentItem.links[position].reported,
    });
    getProduct(currentItem.pk);
  }

  async function getLinkHistory(position) {
    let json = await notworkRequest('links', {
      method: 'history',
      pk: currentItem.links[position].pk,
    });
    updateLinkHistory(json.item);
    updateShowHistoryLink(true);
  }

  async function updateLinkBookmark(position) {
    await notworkRequest('links', {
      method: 'bookmark',
      pk: currentItem.links[position].pk,
      bookmark: !currentItem.links[position].is_bookmark,
    });
    getProduct(currentItem.pk);
  }

  async function deleteLink() {
    await notworkRequest('links', {
      method: 'delete',
      pk: currentItem.links[editLinkPosition].pk
    });
    getProduct(currentItem.pk);
    updateEditLinkUrl('');
    updateEditLinkPosition(-1);
  }

  async function runBot() {
    let json = await notworkRequest('run_prices', null);
    if (json.success) {
      setTimeout(() => {
        reloadItems();
      }, 3000)
    }
  }

  async function runDivar() {
    let json = await notworkRequest('run_divar', null);
    alert("اگر تا دو دقیقه دیگر کدی دریافت نکردید مجددا بات را اجرا نمایید")
  }

  async function reloadMusicItem() {
    let json = await notworkRequest('run_reload_music_item_prices', null);
    if (json.success) {
      setTimeout(() => {
        reloadItems();
      }, 3000)
    }
  }

  function checkLink() {
    let arr = [];
    let host = newLinkUrl.replace('https://', '').replace('http://', '')
    host = host.substr(0, host.indexOf('/'))
    for (let index = 0; index < currentItem.links.length; index++) {
      if (currentItem.links[index].url === undefined) continue;
      const similar = similarity(currentItem.links[index].url, newLinkUrl);
      let link = currentItem.links[index].url.replace('https://', '').replace('http://', '')
      link = link.substr(0, link.indexOf('/'))
      if (similar >= 0.8 || similarity(host, link) >= 0.9)
        arr.push(currentItem.links[index].url)
    }
    if (arr.length !== 0) {
      duplicateLinks = arr;
      updateDuplicateModal(true);
    } else
      addLink();
  }

  function renderChanged(color, value) {
    if (value === 0) {
      return <div />
    }
    return (
      <div
        style={{
          backgroundColor: color,
          alignSelf: 'flex-end',
          alignItems: 'center',
          justifyContent: 'center',
          height: '1.5vw',
          width: '1.5vw',
          borderRadius: '50%'
        }}
      >
        <span
          className="custom_font"
          style={{
            color: '#fff',
          }}
        >
          {value}
        </span>
      </div>
    );
  }

  function similarity(s1, s2) {
    var longer = s1;
    var shorter = s2;
    if (s1.length < s2.length) {
      longer = s2;
      shorter = s1;
    }
    var longerLength = longer.length;
    if (longerLength === 0) {
      return 1.0;
    }
    return (longerLength - editDistance(longer, shorter)) / parseFloat(longerLength);
  }

  function editDistance(s1, s2) {
    s1 = s1.toLowerCase();
    s2 = s2.toLowerCase();

    var costs = [];
    for (var i = 0; i <= s1.length; i++) {
      var lastValue = i;
      for (var j = 0; j <= s2.length; j++) {
        if (i === 0)
          costs[j] = j;
        else {
          if (j > 0) {
            var newValue = costs[j - 1];
            if (s1.charAt(i - 1) !== s2.charAt(j - 1))
              newValue = Math.min(Math.min(newValue, lastValue),
                costs[j]) + 1;
            costs[j - 1] = lastValue;
            lastValue = newValue;
          }
        }
      }
      if (i > 0)
        costs[s2.length] = lastValue;
    }
    return costs[s2.length];
  }

  function renderProducts() {
    return (
      <div
        style={{
          height: window.innerHeight,
          flexDirection: 'row',
          backgroundColor: '#EFEFEF'
        }}
      >
        <div style={{ flex: 6, display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingLeft: 10,
              paddingRight: 10
            }}
          >
            <input
              type="text"
              onChange={event => seachChange(event.target.value)}
              style={{
                flex: 1,
                marginRight: 10,
                marginLeft: 10,
                marginTop: 10,
                marginBottom: 10,
                borderRadius: 10,
                fontSize: 20,
                textAlign: 'center',
                borderWidth: 1,
                borderStyle: 'solid',
                borderColor: '#000'
              }}
            />
            <div
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                cursor: 'pointer'
              }}
            >
              <span style={{ fontSize: 14, marginRight: 5, marginLeft: 10 }}>
                هشدار
              </span>
              <input
                onChange={(event) => {
                  if (event.target.checked) {
                    audio = new Audio(`${serverURL}static/notif.mp3`);
                    audio.play();
                  }
                  updatePlaySound(event.target.checked);
                }}
                type="checkbox" />

              <span style={{ fontSize: 14, marginRight: 5, marginLeft: 10 }}>
                به روز رسانی خودکار
              </span>
              <input
                onChange={(event) => {
                  updateAutoRefresh(event.target.checked);
                }}
                type="checkbox" />
            </div>
          </div>
          <div
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingLeft: 10,
              paddingRight: 10
            }}
          >
            <div
              style={{
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
              }}
            >
              <span
                onClick={() => {
                  if (queryOption.page + 1 === Math.ceil(lastCrawl.total / queryOption.pageSize))
                    return;
                  updateQueryOption({ ...queryOption, 'page': queryOption.page + 1 });
                }}
                style={{
                  fontSize: 14,
                  marginRight: 5,
                  marginLeft: 5,
                  color: queryOption.page + 1 === Math.ceil(lastCrawl.total / queryOption.pageSize) ? '#CCC' : '#000',
                  cursor: queryOption.page + 1 === Math.ceil(lastCrawl.total / queryOption.pageSize) ? 'default' : 'pointer'
                }}
              >
                بعد
              </span>
              <span style={{ fontSize: 14, marginRight: 5, marginLeft: 5 }}>
                {queryOption.page + 1} / {Math.ceil(lastCrawl.total / queryOption.pageSize)}
              </span>
              <span
                onClick={() => {
                  if (queryOption.page === 0)
                    return;
                  updateQueryOption({ ...queryOption, 'page': queryOption.page - 1 });
                }}
                style={{
                  fontSize: 14,
                  marginRight: 5,
                  marginLeft: 5,
                  color: queryOption.page === 0 ? '#CCC' : '#000',
                  cursor: queryOption.page === 0 ? 'default' : 'pointer'
                }}
              >
                قبل
              </span>
              <div style={{ flex: 1 }} />
              <span
                onClick={() => { updateQueryOption({ ...queryOption, 'sort_by': 1 - queryOption.sort_by }) }}
                style={{
                  cursor: 'pointer',
                  textAlign: 'center',
                  backgroundColor: '#F5E5D2',
                  fontSize: 13,
                  paddingRight: 5,
                  paddingLeft: 5,
                  paddingTop: 2,
                  paddingBottom: 5,
                  borderRadius: 5,
                  marginRight: 10
                }}
              >
                {queryOption.sort_by === 0 ? 'تعداد تغییر' : 'جدیدترین'}
              </span>

              <input
                style={{ width: '5vw' }}
                value={queryOption.pageSize}
                onChange={(event) => updateQueryOption({ ...queryOption, 'pageSize': parseInt(event.target.value) })}
                type="number" />
              <span style={{ fontSize: 14, marginRight: 5, marginLeft: 5 }}>
                نمایش در هر صفحه
              </span>

              <span style={{ fontSize: 14, marginRight: 5, marginLeft: 5 }}>
                افزایش
              </span>
              <input
                checked={queryOption.increase}
                onClick={() => { updateQueryOption({ ...queryOption, 'increase': !queryOption.increase }) }}
                type="checkbox" />

              <span style={{ fontSize: 14, marginRight: 5, marginLeft: 5 }}>
                موجودشده
              </span>
              <input
                checked={queryOption.in_stock}
                onClick={() => { updateQueryOption({ ...queryOption, 'in_stock': !queryOption.in_stock }) }}
                type="checkbox" />

              <span style={{ fontSize: 14, marginRight: 5, marginLeft: 5 }}>
                ناموجود
              </span>
              <input
                checked={queryOption.out_of_stock}
                onClick={() => { updateQueryOption({ ...queryOption, 'out_of_stock': !queryOption.out_of_stock }) }}
                type="checkbox" />

              <span style={{ fontSize: 14, marginRight: 5, marginLeft: 5 }}>
                کاهش
              </span>
              <input
                checked={queryOption.decrease}
                onClick={() => { updateQueryOption({ ...queryOption, 'decrease': !queryOption.decrease }) }}
                type="checkbox" />

              <span style={{ fontSize: 14, marginRight: 5, marginLeft: 5, color: '#AAA' }}>
                همه
              </span>
              <input
                disabled
                checked={!queryOption.increase && !queryOption.decrease &&
                  !queryOption.in_stock && !queryOption.out_of_stock}
                type="checkbox" />
            </div>
          </div>
          <div
            style={{
              flex: 1,
              backgroundColor: '#fff',
              borderRadius: 20,
              paddingTop: 20,
              paddingBottom: 20,
              justifyContent: 'center',
              flexDirection: 'row-reverse',
              flexWrap: 'wrap',
              overflowY: 'scroll'
            }}
          >
            {products.map((data, index) =>
              search !== '' && !data.name.includes(search) ? null :
                <div
                  onClick={() => getProduct(data.pk)}
                  style={{
                    width: "12vw",
                    height: "12vw",
                    cursor: 'pointer',
                    backgroundImage: `url(${data.image})`,
                    backgroundSize: 'cover',
                    borderRadius: 20,
                    borderColor: 'red',
                    borderStyle: data.is_active ? null : 'solid',
                    marginRight: 10,
                    marginLeft: 10,
                    marginTop: 5,
                    marginBottom: 5,
                    boxShadow: "0 0 5px 2px #ccc"
                  }}
                >
                  <div
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between'
                    }}
                  >
                    {renderChanged('green', data.increase)}
                    {renderChanged('blue', data.in_stock)}
                    {renderChanged('gray', data.out_of_stock)}
                    {renderChanged('red', data.decrease)}
                  </div>
                  <div style={{ flex: 1 }} />
                  <p
                    style={{
                      width: '100%',
                      fontSize: '0.75vw',
                      textAlign: 'center',
                      backgroundColor: '#00000075',
                      color: '#fff'
                    }}
                  >
                    {data.name}
                  </p>
                </div>
            )}
          </div>
        </div>

        <Modal
          size="lg"
          show={errorsModal}
          onHide={() => updateErrorsModal(false)}
        >
          <Modal.Header style={{ alignItems: 'center' }}>
            <p style={{ fontSize: 22 }}> لینک های نیازمند به بررسی </p>
          </Modal.Header>
          <Modal.Body style={{ height: window.innerHeight * 0.7, overflowY: 'scroll' }}>
            {errorItems.map((data, index) =>
              <div
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  marginBottom: 5
                }}
              >
                <img
                  onClick={() => window.open(data.url, "_blank")}
                  src={`${serverURL}static/open-external-link.png`}
                  style={{
                    height: 15,
                    width: 15,
                    marginRight: 5,
                    cursor: 'pointer'
                  }}
                />

                <span
                  style={{ direction: 'ltr' }}
                  onDoubleClick={() => {
                    updateNewLinkInput(false);
                    updateNewLinkUrl('');
                    updateEditLinkUrl(data.url);
                    updateEditLinkPosition(index);
                  }}
                >
                  {decodeURI(data.url)}
                </span>
              </div>
            )}
          </Modal.Body>
          <Modal.Footer style={{ justifyContent: 'center', flexDirection: 'row' }}>
            <p
              onClick={() => {
                updateErrorMode('null');
                getErrors('null');
              }}
              style={{
                fontSize: 15,
                cursor: 'pointer',
                paddingTop: 5,
                paddingBottom: 5,
                paddingLeft: 15,
                paddingRight: 15,
                borderRadius: 5,
                borderStyle: 'solid',
                borderColor: '#000',
                borderWidth: 1,
                backgroundColor: errorMode === 'null' ? '#1A8EFF' : '#FFF',
                color: errorMode === 'null' ? '#fff' : '#000'
              }}
            >
              لینک های مشکوک
            </p>
            <p
              onClick={() => {
                updateErrorMode('none');
                getErrors('none');
              }}
              style={{
                fontSize: 15,
                cursor: 'pointer',
                paddingTop: 5,
                paddingBottom: 5,
                paddingLeft: 15,
                paddingRight: 15,
                borderRadius: 5,
                borderStyle: 'solid',
                borderColor: '#000',
                borderWidth: 1,
                backgroundColor: errorMode === 'none' ? '#1A8EFF' : '#FFF',
                color: errorMode === 'none' ? '#fff' : '#000'
              }}
            >
              لینک های اجرا نشده
            </p>
            <p
              onClick={() => {
                updateErrorMode('error');
                getErrors('error');
              }}
              style={{
                fontSize: 15,
                cursor: 'pointer',
                paddingTop: 5,
                paddingBottom: 5,
                paddingLeft: 15,
                paddingRight: 15,
                borderRadius: 5,
                borderStyle: 'solid',
                borderColor: '#000',
                borderWidth: 1,
                backgroundColor: errorMode === 'error' ? '#1A8EFF' : '#FFF',
                color: errorMode === 'error' ? '#fff' : '#000'
              }}
            >
              خطا در هنگام اجرا
            </p>
          </Modal.Footer>
        </Modal>

        <Modal
          size="lg"
          show={warningModal}
          onHide={() => updateWarningModal(false)}
        >
          <Modal.Header style={{ alignItems: 'center' }}>
            <p style={{ fontSize: 22 }}> در دست راه اندازی </p>
          </Modal.Header>
          <Modal.Body>
            <p style={{ textAlign: 'center' }}>
              موارد جدید در دست راه اندازی هستند.
            </p>
          </Modal.Body>
        </Modal>

        <Modal
          size="lg"
          show={showLinkHistory}
          onHide={() => updateShowHistoryLink(false)}
        >
          <Modal.Header style={{ alignItems: 'center' }}>
            <p style={{ fontSize: 22 }}> تاریخچه لینک </p>
          </Modal.Header>
          <Modal.Body>
            {linkHistory.history.length > 0 && renderLinkHistory()}
          </Modal.Body>
        </Modal>

        <Modal
          size="lg"
          show={duplicateModal}
          onHide={() => updateDuplicateModal(false)}
        >
          <Modal.Header style={{ alignItems: 'center', backgroundColor: '#e87878' }}>
            <p style={{ fontSize: 22 }}> لینک مشابه </p>
          </Modal.Header>
          <Modal.Body>
            <p style={{ textAlign: 'center' }}>
              قبلا لینک های مشابهی برای این آیتم وارد شده است.
            </p>
            {duplicateLinks.map((data, index) =>
              <div
                style={{
                  flexDirection: 'row',
                }}
              >
                <img
                  onClick={() => window.open(data, "_blank")}
                  src={`${serverURL}static/open-external-link.png`}
                  style={{
                    height: 15,
                    width: 15,
                    marginRight: 5,
                    marginTop: 5,
                    cursor: 'pointer'
                  }}
                />
                <span
                  onDoubleClick={() => {
                    updateNewLinkInput(false);
                    updateNewLinkUrl('');
                    updateEditLinkUrl(data.url);
                    updateEditLinkPosition(index);
                  }}
                  style={{ flex: 1, textAlign: 'center', direction: 'ltr' }}
                >
                  {data}
                </span>
              </div>
            )}
          </Modal.Body>
          <Modal.Footer style={{ justifyContent: 'center', flexDirection: 'row' }}>
            <p
              onClick={() => updateDuplicateModal(false)}
              style={{
                fontSize: 22,
                cursor: 'pointer',
                backgroundColor: 'blue',
                paddingTop: 5,
                paddingBottom: 5,
                paddingLeft: 15,
                paddingRight: 15,
                borderRadius: 5,
                color: '#fff'
              }}
            >
              انصراف
            </p>
            <p
              onClick={() => {
                updateDuplicateModal(false);
                addLink();
              }}
              style={{
                fontSize: 22,
                cursor: 'pointer',
                backgroundColor: 'green',
                paddingTop: 5,
                paddingBottom: 5,
                paddingLeft: 15,
                paddingRight: 15,
                borderRadius: 5,
                color: '#fff'
              }}
            >
              مشکلی نیست
            </p>
          </Modal.Footer>
        </Modal>

        <Modal
          size="lg"
          show={deleteItemModal}
          onHide={() => updateDeleteItemModal(false)}
        >
          <Modal.Header style={{ alignItems: 'center' }}>
            <p style={{ fontSize: 22 }}> از حذف آیتم فعلی مطمئن هستید؟ </p>
          </Modal.Header>
          <Modal.Body>
            <p
              onClick={() => {
                updateDeleteItemModal(false);
                changeModal(false);
                deleteProduct();
              }}
            >
              بلی
            </p>
          </Modal.Body>
        </Modal>

        <Modal
          size="lg"
          show={showProductModal}
          onHide={() => changeModal(false)}
        >
          <Modal.Header style={{ alignItems: 'center' }}>
            <p style={{ fontSize: 22 }}> تاریخچه تغییرات </p>
          </Modal.Header>
          <Modal.Body>
            {renderLinks()}
          </Modal.Body>
        </Modal>

        <Modal
          size="lg"
          show={showNewItemModal}
          onHide={() => changeNewItemModal(false)}
        >
          <Modal.Header style={{ alignItems: 'center' }}>
            <p style={{ fontSize: 22 }}> آیتم جدید </p>
          </Modal.Header>
          <Modal.Body>
            <input
              className="custom_font"
              type="text"
              placeholder="نام"
              value={newItemName}
              onChange={event => updateNewItemName(event.target.value)}
              style={{
                marginRight: 10,
                marginLeft: 10,
                marginTop: 25,
                marginBottom: 5,
                borderRadius: 10,
                fontSize: 20,
                textAlign: 'center',
                borderWidth: 1,
                borderStyle: 'solid',
                borderColor: '#000'
              }}
            />
            <input
              className="custom_font"
              type="text"
              placeholder="آدرس"
              value={newItemUrl}
              onChange={event => updateNewItemUrl(event.target.value)}
              style={{
                marginRight: 10,
                marginLeft: 10,
                marginTop: 5,
                marginBottom: 5,
                borderRadius: 10,
                fontSize: 20,
                textAlign: 'center',
                borderWidth: 1,
                borderStyle: 'solid',
                borderColor: '#000'
              }}
            />
            <input
              className="custom_font"
              type="text"
              placeholder="عکس"
              value={newItemImage}
              onChange={event => updateNewItemImage(event.target.value)}
              style={{
                marginRight: 10,
                marginLeft: 10,
                marginTop: 5,
                marginBottom: 5,
                borderRadius: 10,
                fontSize: 20,
                textAlign: 'center',
                borderWidth: 1,
                borderStyle: 'solid',
                borderColor: '#000'
              }}
            />
          </Modal.Body>
          <Button
            onClick={() => {
              if (newItemMode === 'create')
                addNewItem();
              else if (newItemMode === 'update')
                updateItem();
            }}
            className="custom_font"
            variant="primary"
          >
            ثبت آیتم
          </Button>
        </Modal>
        <Modal
          size="lg"
          show={showDivarPhoneNumberModal}
          onHide={() => changeDivarPhoneNumberModal(false)}
        >
          <Modal.Header style={{ alignItems: 'center' }}>
            <p style={{ fontSize: 22 }}> شماره تلفن برای لاگین به دیوار </p>
          </Modal.Header>
          <Modal.Body>
            <input
              className="custom_font"
              type="phonenumber"
              placeholder="شماره تلفن"
              value={divarPhoneNumber}
              onChange={event => changeDivarPhoneNumber(event.target.value)}
              style={{
                marginRight: 10,
                marginLeft: 10,
                marginTop: 25,
                marginBottom: 5,
                borderRadius: 10,
                fontSize: 20,
                textAlign: 'center',
                borderWidth: 1,
                borderStyle: 'solid',
                borderColor: '#000'
              }}
            />
          </Modal.Body>
          <Button
            onClick={send_divarPhoneNumber}
            className="custom_font"
            variant="primary"
          >
            ثبت شماره و ارسال کد
          </Button>
        </Modal>
        <Modal
          size="lg"
          show={showDivarCodeModal}
          onHide={() => changeDivarCodeModal(false)}
        >
          <Modal.Header style={{ alignItems: 'center' }}>
            <p style={{ fontSize: 22 }}> کد ارسالی </p>
          </Modal.Header>
          <Modal.Body>
            <input
              className="custom_font"
              type="phonenumber"
              placeholder="کد ارسالی"
              value={divarCode}
              onChange={event => changeDivarCode(event.target.value)}
              style={{
                marginRight: 10,
                marginLeft: 10,
                marginTop: 25,
                marginBottom: 5,
                borderRadius: 10,
                fontSize: 20,
                textAlign: 'center',
                borderWidth: 1,
                borderStyle: 'solid',
                borderColor: '#000'
              }}
            />
          </Modal.Body>
          <Button
            onClick={send_divarCode}
            className="custom_font"
            variant="primary"
          >
            ذخیره کد
          </Button>
        </Modal>
        <div
          style={{
            flex: 1,
            backgroundColor: '#1A8EFF',
            alignItems: 'center',
          }}
        >
          <div
            onClick={() => {
              if (lastCrawl.lastCrawlEnded.length === 8) {
                updateLastCrawl({
                  'lastCrawlEnded': 'initializing',
                });
                runBot()
              }
            }}
            style={{
              alignItems: 'center',
              justifyContent: 'center',
              marginTop: '2vw',
              backgroundColor: lastCrawl.lastCrawlEnded.length === 8 ? 'black' : 'gray',
              cursor: lastCrawl.lastCrawlEnded.length === 8 ? 'pointer' : 'default',
              paddingTop: 5,
              paddingBottom: 5,
              paddingLeft: 15,
              paddingRight: 15,
              borderRadius: 10,
            }}
          >
            <p
              style={{
                color: 'white',
                marginBottom: 0
              }}
            >
              اجرای بات
            </p>
          </div>
          <div
            onClick={async () => {
              let json = await notworkRequest('test_timezone', null);
              if (json.success) {
                setTimeout(() => {
                  reloadItems();
                }, 3000)
              }
            }}
            style={{
              alignItems: 'center',
              justifyContent: 'center',
              marginTop: '2vw',
              backgroundColor: 'white',
              cursor: 'pointer',
              paddingTop: 5,
              paddingBottom: 5,
              paddingLeft: 15,
              paddingRight: 15,
              borderRadius: 10,
            }}
          >
            <p
              style={{
                color: 'red',
                marginBottom: 0
              }}
            >
              توقف بات
            </p>
          </div>
          <div
            onClick={() => {
              changeDivarPhoneNumberModal(true);
            }}
            style={{
              alignItems: 'center',
              justifyContent: 'center',
              marginTop: '2vw',
              backgroundColor: 'black',
              cursor: 'pointer',
              paddingTop: 5,
              paddingBottom: 5,
              paddingLeft: 15,
              paddingRight: 15,
              borderRadius: 10,
            }}
          >
            <p
              style={{
                color: 'white',
                marginBottom: 0
              }}
            >
              اجرای بات دیوار
            </p>
          </div>
          <div
            style={{
              flex: 1,
              justifyContent: 'center',
              alignItems: 'center'
            }}
          >
            <p
              style={{
                color: '#ffffff',
                paddingTop: 5,
                paddingBottom: 5,
                paddingLeft: 10,
                paddingRight: 10,
                borderRadius: 5
              }}
            >
              لیست محصولات
            </p>
            <p
              style={{
                color: '#fff',
                cursor: 'pointer'
              }}
              onClick={() => { updateErrorsModal(true) }}
            >
              گزارش خرابی ها
            </p>
            <p
              style={{
                color: '#fff',
                cursor: 'pointer'
              }}
              onClick={reloadMusicItem}
            >
              قیمت های دنیای ساز
            </p>
            <p
              style={{
                color: '#fff',
                cursor: 'pointer'
              }}
              onClick={() => window.open(`${serverURL}create_and_download_backup/`, '_blank').focus()}
            >
              دانلود بک آپ
            </p>
            <p
              style={{
                color: '#fff',
                cursor: 'pointer',
                backgroundColor: 'red',
                paddingLeft: 8,
                paddingRight: 8,
                paddingTop: 2,
                paddingBottom: 2,
                borderRadius: 10
              }}
              onClick={() => window.open(`${serverURL}download_divar_all/`, '_blank').focus()}
            >
              کل کاربران دیوار
            </p>
            <p
              style={{
                color: '#fff',
                cursor: 'pointer',
                backgroundColor: 'red',
                paddingLeft: 8,
                paddingRight: 8,
                paddingTop: 2,
                paddingBottom: 2,
                borderRadius: 10
              }}
              onClick={() => window.open(`${serverURL}download_divar_today/`, '_blank').focus()}
            >
              کاربران در 24 ساعت اخیر
            </p>
          </div>
          <p
            style={{
              color: '#e1e100',
              whiteSpace: 'pre-line',
              textAlign: 'center'
            }}
            onClick={() => { updateWarningModal(true) }}
          >
            آخرین اجرای bot از{'\n'}
            {lastCrawl.lastCrawlStarted} تا {'\n'}
            {lastCrawl.lastCrawlEnded}{'\n'}
            {lastCrawl.lastCrawlChanges}  تفییر جدید{'\n'}
            {lastCrawl.phoneNumberLastTime}{'\n'}
            آخرین شماره {'\n'}
            {lastCrawl.phoneNumberLatest}{'\n'}
            مجموع {lastCrawl.phoneNumberTotal}
          </p>
        </div>
        <div
          className={"fab"}
          onClick={() => {
            newItemMode = 'create';
            changeNewItemModal(true);
          }}
          style={{
            position: 'absolute',
            cursor: 'pointer',
            left: '2vw',
            bottom: '2vw',
            height: '4vw',
            width: '4vw',
            borderRadius: '50%',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <span
            style={{
              color: '#FFF',
              fontSize: '3vw',
              fontFamily: 'arial'
            }}
          >
            +
          </span>
        </div>
      </div>
    );
  }

  function renderLinks() {
    if (currentItem) {
      let divar = currentItem.links.filter(item => item.url && minifyLink(item.url) === "divar.ir");
      currentItem.links = currentItem.links.filter(item => item.url && minifyLink(item.url) !== "divar.ir");
      currentItem.links = [...divar, { isDivar: true }, ...currentItem.links];
    }

    return (
      <div
        style={{
          flexDirection: 'row'
        }}
      >
        <div
          style={{
            flex: 1,
            alignItems: 'center',
            marginRight: 5
          }}
        >
          <div
            style={{
              flexDirection: 'row',
              width: '100%',
              justifyContent: 'space-around'
            }}
          >
            <img
              onClick={() => updateDeleteItemModal(true)}
              src={`${serverURL}static/delete.png`}
              style={{
                height: 25,
                width: 25,
                cursor: 'pointer'
              }}
            />
            <img
              onClick={() => {
                updateNewItemImage(currentItem.image);
                updateNewItemUrl(currentItem.url);
                updateNewItemName(currentItem.name);
                newItemMode = 'update';
                changeNewItemModal(true);
              }}
              src={`${serverURL}static/edit.png`}
              style={{
                height: 25,
                width: 25,
                cursor: 'pointer'
              }}
            />
            <img
              onClick={seenItem}
              src={`${serverURL}static/tick.jpg`}
              style={{
                height: 25,
                width: 25,
                cursor: 'pointer'
              }}
            />
          </div>
          <img
            onClick={() => window.open(currentItem.url, "_blank")}
            style={{
              cursor: 'pointer',
              width: '100%',
              aspectRatio: 1
            }}
            src={currentItem && currentItem.image}
          />
          <p style={{ textAlign: 'center' }}>
            {currentItem && currentItem.name}
          </p>
          <div style={{ flexDirection: 'row' }}>
            <input
              checked={currentItem && currentItem.is_active}
              onChange={updateItemActive}
              type="checkbox" />
            <span style={{ marginLeft: 10 }}>
              فعال
            </span>
          </div>

          <p
            onClick={() => {
              let id = currentItem.url.split("/")[4];
              window.open(`https://www.donyayesaaz.com/products.php?productID=${id}`, "_blank")
            }}
            style={{
              cursor: 'pointer',
              textAlign: 'center',
              backgroundColor: '#F5E5D2',
              paddingRight: 5,
              paddingLeft: 5,
              paddingTop: 2,
              paddingBottom: 5,
              borderRadius: 5
            }}
          >
            قیمت شما: {currentItem && (currentItem.price !== -1 ? `${prettifyNumbers(currentItem.price)} تومان` : 'ناموجود')}
          </p>
          <p>
            تعداد لینک: {currentItem && currentItem.links.length}
          </p>
        </div>
        <div
          style={{
            flex: 3,
            height: window.innerHeight * 0.7,
            overflowY: 'scroll',
          }}
        >
          {currentItem && currentItem.links.map((data, index) =>
            data.isDivar ?
              <div style={{
                width: '95%',
                height: 2,
                backgroundColor: '#000',
                minHeight: 2,
                alignSelf: 'center'
              }} /> :
              editLinkPosition !== index ?
                <div
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    marginBottom: 5
                  }}
                >
                  <img
                    onClick={() => window.open(data.url, "_blank")}
                    src={`${serverURL}static/open-external-link.png`}
                    style={{
                      height: 15,
                      width: 15,
                      marginRight: 5,
                      cursor: 'pointer'
                    }}
                  />

                  <img
                    onClick={() => {
                      updateRunPricePosition(index);
                      runTestLink(data.url)
                    }}
                    src={runPricePosition !== index ?
                      `${serverURL}static/investigate.png` :
                      `${serverURL}static/loading.gif`
                    }
                    style={{
                      height: 15,
                      width: 15,
                      marginRight: 5,
                      cursor: 'pointer'
                    }}
                  />

                  <img
                    onClick={() => updateLinkReported(index)}
                    src={`${serverURL}static/report.png`}
                    style={{
                      height: 15,
                      width: 15,
                      marginRight: 5,
                      filter: `grayscale(${data.reported ? 0 : 1})`,
                      cursor: 'pointer'
                    }}
                  />

                  <img
                    onClick={() => updateLinkBookmark(index)}
                    src={data.is_bookmark ? `${serverURL}static/filled_bookmark.png` : `${serverURL}static/empty_bookmark.png`}
                    style={{
                      height: 15,
                      width: 15,
                      marginRight: 5,
                      filter: `grayscale(${data.reported ? 0 : 1})`,
                      cursor: 'pointer'
                    }}
                  />

                  <img
                    onClick={() => getLinkHistory(index)}
                    src={`${serverURL}static/graph.png`}
                    style={{
                      height: 15,
                      width: 15,
                      marginRight: 5,
                      filter: `grayscale(${data.reported ? 0 : 1})`,
                      cursor: 'pointer'
                    }}
                  />

                  <Dropdown>
                    <Dropdown.Toggle variant="success" id="dropdown-basic">
                      {importance[data.importance / 25]}
                    </Dropdown.Toggle>

                    <Dropdown.Menu>
                      <Dropdown.Item onClick={() => updateLinkImportance(100, index)}>همیشه</Dropdown.Item>
                      <Dropdown.Item onClick={() => updateLinkImportance(75, index)}>75%</Dropdown.Item>
                      <Dropdown.Item onClick={() => updateLinkImportance(50, index)}>50%</Dropdown.Item>
                      <Dropdown.Item onClick={() => updateLinkImportance(25, index)}>25%</Dropdown.Item>
                      <Dropdown.Item onClick={() => updateLinkImportance(0, index)}>غیرفعال</Dropdown.Item>
                    </Dropdown.Menu>
                  </Dropdown>
                  <span
                    style={{ marginLeft: 5 }}
                    onDoubleClick={() => {
                      updateNewLinkInput(false);
                      updateNewLinkUrl('');
                      updateEditLinkUrl(data.url);
                      updateEditLinkPosition(index);
                    }}
                  >
                    {minifyLink(data.url)}
                  </span>
                  <span
                    style={{
                      fontSize: 10,
                      marginLeft: 5,
                      color: 'gray'
                    }}
                  >
                    {data.history.length === 0 ? '--' : lastTimeChanged(data.history[0].created)}
                  </span>
                  <div style={{ flex: 1 }} />
                  {data.recent_change !== 0 &&
                    renderRecentChange(data.recent_change)
                  }
                  <span style={{ textAlign: 'right' }}>
                    {prettifyNumbers(
                      data.history.length === 0 ? '0 تومان' :
                        data.history[0].value === -1 ? 'ناموجود' : `${data.history[0].value} تومان`)}
                  </span>
                </div>
                :
                <div
                  style={{
                    flexDirection: 'row',
                    marginBottom: 5
                  }}
                >
                  <input
                    type="text"
                    autoFocus
                    value={editLinkUrl}
                    onChange={event => updateEditLinkUrl(event.target.value)}
                    onKeyUp={event => {
                      if (event.keyCode === 13) {
                        if (editLinkUrl === '') {
                          deleteLink();
                        } else
                          updateLink();
                      }
                    }}
                    style={{
                      flex: 1,
                      marginRight: 10,
                      marginLeft: 10,
                      borderRadius: 10,
                      fontSize: 15,
                      textAlign: 'left'
                    }}
                  />
                </div>

          )}
          {showNewLinkInput &&
            <input
              type="text"
              autoFocus
              onChange={event => updateNewLinkUrl(event.target.value)}
              onKeyUp={event => {
                if (event.keyCode === 13) {
                  checkLink();
                }
              }}
              style={{
                marginRight: 10,
                marginLeft: 10,
                marginTop: 25,
                marginBottom: 25,
                borderRadius: 10,
                fontSize: 15,
                textAlign: 'left'
              }}
            />
          }
        </div>
        <div
          className={"fab"}
          onClick={() => updateNewLinkInput(true)}
          style={{
            position: 'absolute',
            cursor: 'pointer',
            left: '2vw',
            bottom: '2vw',
            height: '4vw',
            width: '4vw',
            borderRadius: '50%',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <span
            style={{
              color: '#FFF',
              fontSize: '3vw',
              fontFamily: 'arial'
            }}
          >
            +
          </span>
        </div>
      </div>
    );
  }

  function renderRecentChange(recent_change) {
    if (recent_change > 0)
      return (
        <span style={{ color: '#014601', marginLeft: 5, marginRight: 5, fontSize: 12, flex: 1, textAlign: 'center' }}>
          +{prettifyNumbers(recent_change)} تومان
        </span>
      );
    if (recent_change === -2)
      return (
        <span style={{ color: 'gray', marginLeft: 5, marginRight: 5, fontSize: 12, flex: 1, textAlign: 'center' }}>
          ناموجود شده
        </span>
      );
    if (recent_change === -1)
      return (
        <span style={{ color: 'blue', marginLeft: 5, marginRight: 5, fontSize: 12, flex: 1, textAlign: 'center' }}>
          موجود شده
        </span>
      );
    return (
      <span style={{ color: 'red', marginLeft: 5, marginRight: 5, fontSize: 12, flex: 1, textAlign: 'center' }}>
        {prettifyNumbers(recent_change)} تومان
      </span>
    );
  }

  function minifyLink(link) {
    link = link.replace('https://', '')
    link = link.replace('http://', '')
    link = link.substr(0, link.indexOf('/'))
    return link
  }

  function lastTimeChanged(changeTime) {
    let date = new moment(changeTime);
    let difference = Math.abs(Math.floor(moment.duration(date.diff(moment())).asDays()));
    if (difference === 1)
      return 'امروز';
    else if (difference === 2)
      return 'دیروز';
    else
      return `${difference} روز پیش`
  }

  function renderLinkHistory() {
    const options = {
      scales: {
        y: {
          ticks: {
            beginAtZero: true,
            min: 0
          }
        },
        x: {
          display: true,
          text: 'test'
        }
      }
    };

    const data = {
      labels: [],
      datasets: [
        {
          label: 'قیمت',
          data: [],
          backgroundColor: 'rgb(255, 99, 132)',
          borderColor: 'rgba(255, 99, 132, 0.2)',
        },
      ],
    };

    data.labels.push(linkHistory.history[0].value);
    data.datasets[0].data.push({ x: 0, y: linkHistory.history[0].value });

    for (let index = 0; index < linkHistory.history.length; index++) {
      let date = new moment(linkHistory.history[index].created);
      let difference = Math.abs(Math.floor(moment.duration(date.diff(moment())).asDays()));
      data.labels.push(linkHistory.history[index].value);
      data.datasets[0].data.push({ x: -difference, y: linkHistory.history[index].value });
    }
    return <Scatter data={data} options={options} />;
  }

  function prettifyNumbers(price) {
    return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }

  function renderLogin() {
    return (
      <div
        style={{
          width: '100%',
          justifyContent: 'center',
          alignItems: 'center',
          display: 'flex',
          paddingTop: 10,
          paddingBottom: 10,
          paddingRight: 10,
          paddingLeft: 10,
        }}
      >
        <div
          style={{
            width: 720,
            height: 600,
            display: 'flex',
            flexDirection: 'column',
            background: '#F0F4F7',
            borderRadius: 15
          }}>
          <div
            style={{
              display: 'flex',
              flexDirection: 'row',
              flex: 1,
              alignItems: 'center'
            }}>
            <div style={{ flex: 1 }} />
            <img
              src={"https://www.donyayesaaz.com/media/logo/logo.png?20200430120932"}
              style={{
                width: 230,
                height: 54,
              }} />
            <div style={{ flex: 1 }} />
            <div>
              <p
                style={{
                  textAlign: 'center',
                  color: '#000',
                  fontSize: 18
                }}
              >
                لطفا رمز عبور را وارد کنید
              </p>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <input
                  maxLength={50}
                  placeholder={'_ _ _'}
                  type='password'
                  style={{ textAlign: 'center', }}
                  className={'custom_font'}
                  value={password}
                  onChange={(event) => updatePassword(event.target.value)}
                  onKeyUp={event => {
                    if (event.keyCode === 13) {
                      if (password === 'D0nyayes@@z') {
                        localStorage.setItem('login_token', 'donyasaaz');
                        updatePassword('');
                      } else
                        alert("رمز وارد شده اشتباه است")
                    }
                  }}
                />
              </div>
            </div>
            <div style={{ flex: 1 }} />
          </div>
        </div>
      </div>
    )
  }

  return (
    localStorage.getItem("login_token") ?
      renderProducts() :
      renderLogin()
  );
}

export default App;
