# [ADD CENTRAL STATE FOR ADI]

# Purpose 

Dissociate the data/state from the view/UI;

Let UI components update separately;

To save team time from debugging hell.

# How

Add a central state for ADI;

Use immutable data to reduce UI's side-effects;

Use diff checking to update UI without heavy reload.

# State ( Data of ADI )

## Core Data Structure

```javascript
state: {   
    charList: "",
    charListSelection: {
        start: 0,
        end: 0
    }
}
```

## Core Manipulate functions

```javascript
// all manipulation must be done with the two methods
manipulate: {
    replaceBetween: (start, end, add) => {
        var index = Math.min(start, end);
        var count = Math.abs(start - end);
        var str = state.charList;
        state.charList = str.slice(0, index) + add + str.slice(index + count);
    },
    select: (start, end) => {
        state.charListSelection.start = start;
        state.charListSelection.end = end;
    }
}
```

## Parsed Data Structure

### BlockList
```javascript
[{
    blockCharList: "",
    blockCharListSelection: {
        start: 0,
        end: 0
    },
    blockSelected: false
}]
```

## Data Render

### Editor

```
Use state info directly
```

### Preview

```javascript
if block type is mod
    render with mod.render(data)
if block type is not mod
    render with markdown render
```

### AttrsEditor

```
checkout attrEditorCardList
render attrEditorCardList
```

## Data Update

```
For preview, use block type as cache key to cache rendered DOM, recycle cached DOM to improve the performance

For AttrsEditor, use attr type as cache key to cache rendered DOM, recycle cached DOM to improve the performance
```

## Mod

```javascript
{
    getAttrsTemplate: () => attrsTemplate,
    render: (data, DOM) => {
        if DOM is the cached DOM
            ask the mod component(attached with the DOM) for updating
        else
            render from scratch
    }
}
```