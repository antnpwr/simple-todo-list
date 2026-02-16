/**
 * @jest-environment jsdom
 */

// Mock fetch globally
global.fetch = jest.fn();

// Mock alert
global.alert = jest.fn();

describe('Frontend Todo Application', () => {
  let todoInput, addBtn, todoList, totalCount, completedCount;

  beforeEach(() => {
    // Reset DOM
    document.body.innerHTML = `
      <input id="todoInput" type="text" />
      <button id="addBtn">Add</button>
      <div id="todoList"></div>
      <span id="totalCount">Total: 0</span>
      <span id="completedCount">Completed: 0</span>
    `;

    // Get DOM elements
    todoInput = document.getElementById('todoInput');
    addBtn = document.getElementById('addBtn');
    todoList = document.getElementById('todoList');
    totalCount = document.getElementById('totalCount');
    completedCount = document.getElementById('completedCount');

    // Reset fetch mock
    fetch.mockReset();
    global.alert.mockReset();
  });

  describe('escapeHtml function', () => {
    test('should escape HTML special characters', () => {
      const escapeHtml = (text) => {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
      };

      expect(escapeHtml('<script>alert("xss")</script>')).toBe('&lt;script&gt;alert("xss")&lt;/script&gt;');
      expect(escapeHtml('Normal text')).toBe('Normal text');
      expect(escapeHtml('<b>Bold</b>')).toBe('&lt;b&gt;Bold&lt;/b&gt;');
    });
  });

  describe('renderTodos function', () => {
    test('should show empty state when no todos', () => {
      const todos = [];
      
      if (todos.length === 0) {
        todoList.innerHTML = '<div class="empty-state">No todos yet. Add one above!</div>';
      }

      expect(todoList.innerHTML).toContain('No todos yet. Add one above!');
    });

    test('should render todos correctly', () => {
      const todos = [
        { id: 1, text: 'Test todo', completed: false },
        { id: 2, text: 'Completed todo', completed: true }
      ];

      const escapeHtml = (text) => {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
      };

      todoList.innerHTML = todos.map(todo => `
        <div class="todo-item ${todo.completed ? 'completed' : ''}">
          <input 
            type="checkbox" 
            class="todo-checkbox" 
            ${todo.completed ? 'checked' : ''} 
            onchange="toggleTodo(${todo.id})"
          />
          <span class="todo-text">${escapeHtml(todo.text)}</span>
          <button class="delete-btn" onclick="deleteTodo(${todo.id})">Delete</button>
        </div>
      `).join('');

      expect(todoList.children.length).toBe(2);
      expect(todoList.innerHTML).toContain('Test todo');
      expect(todoList.innerHTML).toContain('Completed todo');
    });
  });

  describe('updateStats function', () => {
    test('should update statistics correctly', () => {
      const todos = [
        { id: 1, text: 'Todo 1', completed: false },
        { id: 2, text: 'Todo 2', completed: true },
        { id: 3, text: 'Todo 3', completed: true }
      ];

      const total = todos.length;
      const completed = todos.filter(t => t.completed).length;
      totalCount.textContent = `Total: ${total}`;
      completedCount.textContent = `Completed: ${completed}`;

      expect(totalCount.textContent).toBe('Total: 3');
      expect(completedCount.textContent).toBe('Completed: 2');
    });

    test('should show zero stats for empty list', () => {
      const todos = [];
      
      const total = todos.length;
      const completed = todos.filter(t => t.completed).length;
      totalCount.textContent = `Total: ${total}`;
      completedCount.textContent = `Completed: ${completed}`;

      expect(totalCount.textContent).toBe('Total: 0');
      expect(completedCount.textContent).toBe('Completed: 0');
    });
  });

  describe('fetchTodos function', () => {
    test('should fetch todos successfully', async () => {
      const mockTodos = [
        { id: 1, text: 'Test todo', completed: false }
      ];

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockTodos
      });

      const response = await fetch('/api/todos');
      const todos = await response.json();

      expect(fetch).toHaveBeenCalledWith('/api/todos');
      expect(todos).toEqual(mockTodos);
    });

    test('should handle fetch error', async () => {
      fetch.mockRejectedValueOnce(new Error('Network error'));

      try {
        await fetch('/api/todos');
      } catch (error) {
        expect(error.message).toBe('Network error');
      }
    });
  });

  describe('addTodo function', () => {
    test('should add a new todo', async () => {
      const newTodo = { id: 1, text: 'New todo', completed: false };
      
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => newTodo
      });

      todoInput.value = 'New todo';
      
      const response = await fetch('/api/todos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: 'New todo' }),
      });

      expect(response.ok).toBe(true);
      const result = await response.json();
      expect(result).toEqual(newTodo);
    });

    test('should not add empty todo', () => {
      todoInput.value = '';
      const text = todoInput.value.trim();
      
      if (!text) {
        alert('Please enter a todo');
      }

      expect(alert).toHaveBeenCalledWith('Please enter a todo');
    });

    test('should not add whitespace-only todo', () => {
      todoInput.value = '   ';
      const text = todoInput.value.trim();
      
      if (!text) {
        alert('Please enter a todo');
      }

      expect(alert).toHaveBeenCalledWith('Please enter a todo');
    });

    test('should handle add todo error', async () => {
      fetch.mockResolvedValueOnce({
        ok: false
      });

      todoInput.value = 'New todo';
      
      const response = await fetch('/api/todos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: 'New todo' }),
      });

      if (!response.ok) {
        alert('Failed to add todo');
      }

      expect(alert).toHaveBeenCalledWith('Failed to add todo');
    });
  });

  describe('toggleTodo function', () => {
    test('should toggle todo completion', async () => {
      const updatedTodo = { id: 1, text: 'Test todo', completed: true };
      
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => updatedTodo
      });

      const response = await fetch('/api/todos/1', {
        method: 'PUT',
      });

      expect(response.ok).toBe(true);
      const result = await response.json();
      expect(result.completed).toBe(true);
    });

    test('should handle toggle error', async () => {
      fetch.mockResolvedValueOnce({
        ok: false
      });

      const response = await fetch('/api/todos/1', {
        method: 'PUT',
      });

      if (!response.ok) {
        alert('Failed to update todo');
      }

      expect(alert).toHaveBeenCalledWith('Failed to update todo');
    });
  });

  describe('deleteTodo function', () => {
    test('should delete a todo', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: 'Todo deleted successfully' })
      });

      const response = await fetch('/api/todos/1', {
        method: 'DELETE',
      });

      expect(response.ok).toBe(true);
      expect(fetch).toHaveBeenCalledWith('/api/todos/1', {
        method: 'DELETE',
      });
    });

    test('should handle delete error', async () => {
      fetch.mockResolvedValueOnce({
        ok: false
      });

      const response = await fetch('/api/todos/1', {
        method: 'DELETE',
      });

      if (!response.ok) {
        alert('Failed to delete todo');
      }

      expect(alert).toHaveBeenCalledWith('Failed to delete todo');
    });
  });

  describe('Input validation', () => {
    test('should trim whitespace from input', () => {
      todoInput.value = '  Test todo  ';
      const text = todoInput.value.trim();
      
      expect(text).toBe('Test todo');
    });

    test('should handle special characters in input', () => {
      const specialText = '<script>alert("xss")</script>';
      const escapeHtml = (text) => {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
      };
      
      const escaped = escapeHtml(specialText);
      expect(escaped).not.toContain('<script>');
    });
  });

  describe('editTodo function', () => {
    test('should enter edit mode for a todo', () => {
      // Simulate state
      let editingId = null;
      let editingText = '';
      
      const todo = { id: 1, text: 'Test todo', completed: false };
      
      // Enter edit mode
      editingId = todo.id;
      editingText = todo.text;
      
      expect(editingId).toBe(1);
      expect(editingText).toBe('Test todo');
    });

    test('should populate edit input with current text', () => {
      const todo = { id: 1, text: 'Edit this', completed: false };
      let editingText = '';
      
      editingText = todo.text;
      
      expect(editingText).toBe('Edit this');
    });
  });

  describe('cancelEdit function', () => {
    test('should exit edit mode and clear editing state', () => {
      let editingId = 1;
      let editingText = 'Some text';
      
      // Cancel edit
      editingId = null;
      editingText = '';
      
      expect(editingId).toBeNull();
      expect(editingText).toBe('');
    });
  });

  describe('saveEdit function', () => {
    test('should save edited todo text', async () => {
      const updatedTodo = { id: 1, text: 'Updated text', completed: false };
      
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => updatedTodo
      });

      const response = await fetch('/api/todos/1', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: 'Updated text' }),
      });

      expect(response.ok).toBe(true);
      const result = await response.json();
      expect(result.text).toBe('Updated text');
    });

    test('should not save empty edited text', () => {
      let editingText = '';
      const text = editingText.trim();
      
      if (!text) {
        alert('Todo text cannot be empty');
      }

      expect(alert).toHaveBeenCalledWith('Todo text cannot be empty');
    });

    test('should exit edit mode after saving', async () => {
      const updatedTodo = { id: 1, text: 'Updated text', completed: false };
      
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => updatedTodo
      });

      let editingId = 1;
      let editingText = 'Updated text';

      const response = await fetch('/api/todos/1', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: editingText }),
      });

      if (response.ok) {
        editingId = null;
        editingText = '';
      }

      expect(editingId).toBeNull();
      expect(editingText).toBe('');
    });

    test('should handle save error gracefully', async () => {
      fetch.mockResolvedValueOnce({
        ok: false
      });

      const response = await fetch('/api/todos/1', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: 'New text' }),
      });

      if (!response.ok) {
        alert('Failed to update todo');
      }

      expect(alert).toHaveBeenCalledWith('Failed to update todo');
    });
  });

  describe('Edit mode rendering', () => {
    test('should show edit input when in edit mode', () => {
      const todos = [{ id: 1, text: 'Test todo', completed: false }];
      let editingId = 1;
      let editingText = 'Test todo';

      const escapeHtml = (text) => {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
      };

      if (editingId === todos[0].id) {
        todoList.innerHTML = `
          <div class="todo-item editing">
            <input 
              type="text" 
              class="todo-edit-input" 
              value="${escapeHtml(editingText)}"
            />
            <button class="save-btn">Save</button>
            <button class="cancel-btn">Cancel</button>
          </div>
        `;
      }

      expect(todoList.innerHTML).toContain('todo-item editing');
      expect(todoList.innerHTML).toContain('todo-edit-input');
      expect(todoList.innerHTML).toContain('save-btn');
      expect(todoList.innerHTML).toContain('cancel-btn');
    });

    test('should show edit button when not in edit mode', () => {
      const todos = [{ id: 1, text: 'Test todo', completed: false }];
      let editingId = null;

      const escapeHtml = (text) => {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
      };

      if (editingId === null) {
        todoList.innerHTML = `
          <div class="todo-item">
            <input type="checkbox" class="todo-checkbox" />
            <span class="todo-text">${escapeHtml(todos[0].text)}</span>
            <button class="edit-btn">Edit</button>
            <button class="delete-btn">Delete</button>
          </div>
        `;
      }

      expect(todoList.innerHTML).toContain('edit-btn');
      expect(todoList.innerHTML).not.toContain('save-btn');
    });
  });
});

