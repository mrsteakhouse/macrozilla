class DragndropHandler {

  constructor(editor) {
    this.editor = editor;
    this.macro_dragel = null;
    this.legalmove = false;
    this.prev = null;
  }

  handleDrag(e) {
    // move dragel
    const rect = this.macro_dragel.getBoundingClientRect();
    const rect2 = document.getElementById('extension-macrozilla-view').getBoundingClientRect();
    const px = (e.clientX-rect2.left-rect.width/2);
    const py = (e.clientY-rect2.top-rect.height/2);
    this.macro_dragel.style.left = `${px}px`;
    this.macro_dragel.style.top = `${py}px`;

    // update arrows when one of its blocks has been moved
    const arrows = document.querySelectorAll(`.macro_arr_${this.macro_dragel.getAttribute('macro-block-no')}`);
    for (const arrow of arrows) {
      let theotherblock = arrow.getAttribute('class').split(' ')[0];
      if (theotherblock == `macro_arr_${this.macro_dragel.getAttribute('macro-block-no')}`) {
        theotherblock = arrow.getAttribute('class').split(' ')[1];
        theotherblock = theotherblock.substr(10);
        this.editor.updateConnection(arrow, this.macro_dragel, document.querySelector(`[macro-block-no='${theotherblock}']`));
      } else {
        theotherblock = theotherblock.substr(10);
        this.editor.updateConnection(arrow, document.querySelector(`[macro-block-no='${theotherblock}']`), this.macro_dragel);
      }
    }

    // move preview
    const area = this.editor.programArea;
    let prevx = px + area.scrollLeft;
    let prevy = py + area.scrollTop;
    prevx = Math.round(prevx / this.editor.gridsize) * this.editor.gridsize;
    prevy = Math.round(prevy / this.editor.gridsize) * this.editor.gridsize;
    if (prevx > area.children[0].getBoundingClientRect().width || prevy > area.children[0].getBoundingClientRect().height || prevx < 0 || prevy < 0) {
      this.prev.style.display = 'none';
    } else {
      this.prev.style.display = 'block';
    }
    this.prev.style.left = `${prevx}px`;
    this.prev.style.top = `${prevy}px`;

    this.checkDropLegality();
  }

  handleDragStart(e) {
    e.stopPropagation();
    if (e.target instanceof this.editor.Parameter)
      return;

    this.macro_dragel = e.target;
    while (!this.macro_dragel.className.includes('macroblock')) {
      this.macro_dragel = this.macro_dragel.parentNode;
    }

    this.macro_dragel.id = 'currentdrag';
    const rect = this.macro_dragel.getBoundingClientRect();
    const rect2 = document.getElementById('extension-macrozilla-view').getBoundingClientRect();

    // create placeholder
    if (!this.macro_dragel.className.split(' ').includes('placed')) {
      const ph = document.createElement('DIV');
      ph.className = 'macroblock placeholder';
      ph.style.width = `${rect.width - 14}px`;
      ph.style.height = `${rect.height - 14}px`;
      this.macro_dragel.parentNode.insertBefore(ph, this.macro_dragel);
    }

    // reset parameter
    if (this.macro_dragel.parentNode instanceof this.editor.Parameter) {
      this.macro_dragel.parentNode.reset(this.macro_dragel);
    }

    // move dragel
    const px = (e.clientX-rect2.left-rect.width/2);
    const py = (e.clientY-rect2.top-rect.height/2);
    this.macro_dragel.style.left = `${px}px`;
    this.macro_dragel.style.top = `${py}px`;
    this.editor.macroSidebar.appendChild(this.macro_dragel);

    // add preview
    document.querySelectorAll('.macroblock.preview').forEach((prev) => prev.remove());
    this.prev = document.createElement('DIV');
    this.prev.className = 'macroblock preview';
    this.prev.style.width = `${rect.width - 14}px`;
    this.prev.style.height = `${rect.height - 14}px`;
    this.prev.style.display = 'none';
    this.editor.macroInterface.appendChild(this.prev);

    // set all blocks to idling
    document.querySelectorAll('.macroblock').forEach((el) => {
      el.className = el.className.split(' idling').join(' ');
      el.className += ' idling';
      el.style.animationDelay = `${Math.random()}s`;
    });

    this.editor.macroInterface.className += ' ready';
    this.hd = this.handleDrag.bind(this);
    document.addEventListener('mousemove', this.hd, true);
    this.editor.throwTrashHere.className = 'active';
    this.handleDrag(e);
  }

  handleDragEnd(e) {
    document.removeEventListener('mousemove', this.hd, true);
    const area = this.editor.programArea.getBoundingClientRect();

    if (this.macro_dragel.successor)
      this.macro_dragel.successor.predecessor = null;
    if (this.macro_dragel.predecessor)
      this.macro_dragel.predecessor.successor = null;

    // dropped over program area -> create copy at the same location
    if (e.clientX > area.left && e.clientX < area.right && e.clientY > area.top && e.clientY < area.bottom && this.legalmove) {
      const pnode = this.macro_dragel.copy();
      pnode.className = pnode.className.split(' ').includes('macrocard') ? 'macroblock macrocard placed' : 'macroblock placed';
      pnode.id = '';
      pnode.style.left = this.prev.style.left;
      pnode.style.top = this.prev.style.top;
      pnode.addEventListener('mousedown', this.handleDragStart.bind(this));
      pnode.addEventListener('mouseup', this.handleDragEnd.bind(this));
      if (this.macro_dragel.successor)
        pnode.successor.predecessor = pnode;
      if (this.macro_dragel.predecessor)
        pnode.predecessor.successor = pnode;
      if (!this.macro_dragel.className.split(' ').includes('placed'))
        pnode.setAttribute('macro-block-no', this.editor.nextid++);
      this.editor.programArea.children[0].appendChild(pnode);
      if (!pnode.className.split(' ').includes('macrocard')) {
        this.editor.connect(this.editor.connectionnode, pnode);
      } else {
        this.editor.cardpholder.placeCard(pnode);
      }
    }

    this.macro_dragel.id = '';
    this.macro_dragel.style.top = '';
    this.macro_dragel.style.left = '';

    // stop idling
    document.querySelectorAll('.macroblock').forEach((el) => {
      el.className = el.className.split(' ').filter((x) => x !== 'idling').join(' ');
      el.style.animationDelay = '';
    });

    if (!this.macro_dragel.className.includes('placed')) { // dragged from sidebar -> remove placeholder
      document.querySelector('.macroblock.placeholder').parentNode.insertBefore(this.macro_dragel, document.querySelector('.macroblock.placeholder'));
      document.querySelector('.macroblock.placeholder').remove();
    } else { // dragged from program area to sidebar -> delete arrows
      if (!(e.clientX > area.left && e.clientX < area.right && e.clientY > area.top && e.clientY < area.bottom && this.legalmove))
        document.querySelectorAll(`.macro_arr_${this.macro_dragel.getAttribute('macro-block-no')}`).forEach((el) => el.remove());
      document.querySelector('#macrosidebar .placed').remove();
    }

    // remove previews
    document.querySelectorAll('.macroblock.preview').forEach((prev) => prev.remove());

    this.editor.macroInterface.className = this.editor.macroInterface.className.split(' ').filter((x) => x !== 'ready').join(' ');
    this.editor.throwTrashHere.className = '';
    document.querySelectorAll('#programarea .macroblock').forEach((e) => {
      e.style.opacity = '';
    });
    this.macro_dragel = null;
  }

  checkDropLegality() {
    const rect2 = this.prev.getBoundingClientRect();
    const iscard = !this.macro_dragel.abilities.includes('executable');
    this.prev.className = this.prev.className.split(' ').filter((x) => x !== 'illegal').join(' ');
    this.legalmove = true;
    this.editor.connectionnode = null;
    if (iscard)
      this.legalmove = false;

    // May be replaced with better method in the future
    for (const el of this.editor.macroInterface.children) {
      if (el == this.prev || el == this.editor.executePath)
        continue;
      const rect1 = el.getBoundingClientRect();
      if (!iscard && !(rect1.right < rect2.left || rect1.left > rect2.right || rect1.bottom + this.editor.gridsize < rect2.top || rect1.bottom > rect2.top)) {
        el.style.opacity = '0.4';
        this.editor.connectionnode = el;
      } else {
        el.style.opacity = '1';
      }
      if (!(rect1.right < rect2.left || rect1.left > rect2.right || rect1.bottom < rect2.top || rect1.top > rect2.bottom)) {
        if (!iscard) {
          this.legalmove = false;
        } else {
          this.legalmove = false;
          if (this.editor.cardpholder != null)
            this.editor.cardpholder.id = '';
          this.editor.cardpholder = null;
          for (const c of el.querySelectorAll('.cardplaceholder')) {
            const rect3 = c.getBoundingClientRect();
            if (c.accepts.find((x) => this.macro_dragel.abilities.includes(x)) && !(rect3.right < rect2.left || rect3.left > rect2.right || rect3.bottom < rect2.top || rect3.top > rect2.bottom)) {
              this.prev.className = this.prev.className.split(' ').filter((x) => x !== 'illegal').join(' ');
              this.legalmove = true;
              if (this.editor.cardpholder != null)
                this.editor.cardpholder.id = '';
              this.editor.cardpholder = c;
              this.editor.cardpholder.id = 'hovering';
            }
          }
          this.editor.connectionnode = null;
        }
      }
    }

    if (!this.legalmove)
      this.prev.className += ' illegal';
  }

}

window.exports = DragndropHandler;