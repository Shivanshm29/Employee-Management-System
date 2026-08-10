# 🚀 How This App Works: A Complete Vertical Slice (The "Task" Feature)

If you want to understand how this entire project connects, the best way is to follow **one single feature** from the database all the way to the user's screen. 

Let's look at the **Task Management** feature. This guide explains how a Task is created in the database, sent through the API, and displayed in the React frontend.

---

## 1. The Database Level (Django Models)
**File to read:** `backend/apps/tasks/models.py`

Everything starts with the data. A Model is a Python class that represents a table in the database.

```python
# backend/apps/tasks/models.py
class Task(models.Model):
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    assigned_to = models.ForeignKey(User, on_delete=models.CASCADE)
    status = models.CharField(max_length=20, choices=[('PENDING', 'Pending'), ('COMPLETED', 'Completed')])
    created_at = models.DateTimeField(auto_now_add=True)
```
**What to learn here:** Notice how we define the types of data (CharField for short text, TextField for long text) and how `ForeignKey` links a task to a specific User.

---

## 2. The Translation Level (DRF Serializers)
**File to read:** `backend/apps/tasks/serializers.py`

The frontend (React) speaks JSON, but the backend speaks Python. A Serializer translates our Python `Task` model into JSON data that React can understand.

```python
# backend/apps/tasks/serializers.py
class TaskSerializer(serializers.ModelSerializer):
    class Meta:
        model = Task
        fields = ['id', 'title', 'description', 'assigned_to', 'status', 'created_at']
```
**What to learn here:** The serializer is incredibly simple. It just takes the `Task` model and specifies which fields should be exposed to the outside world.

---

## 3. The API Gateway (Django Views/ViewSets)
**File to read:** `backend/apps/tasks/views.py`

When the frontend asks for tasks, it hits an API endpoint (e.g., `GET /api/tasks/`). The View decides *what* data to return.

```python
# backend/apps/tasks/views.py
class TaskViewSet(viewsets.ModelViewSet):
    serializer_class = TaskSerializer
    
    def get_queryset(self):
        # Only return tasks assigned to the currently logged-in user
        return Task.objects.filter(assigned_to=self.request.user)
```
**What to learn here:** The ViewSet automatically handles basic operations (Create, Read, Update, Delete). The `get_queryset` function adds a rule: users can only see their own tasks.

---

## 4. The Data Fetcher (Frontend Axios/Services)
**File to read:** (Usually in a `services` folder, but let's look at how it happens in a component)

The frontend needs to make a network request to the API to get the JSON data.

```javascript
// Inside a React component
import axios from 'axios';

const fetchTasks = async () => {
    // Add the authentication token to prove who we are
    const token = localStorage.getItem('access_token');
    
    const response = await axios.get('http://localhost:8000/api/tasks/', {
        headers: { Authorization: `Bearer ${token}` }
    });
    
    return response.data; // This is the JSON array of tasks!
}
```
**What to learn here:** How to attach JWT tokens to secure requests using Axios.

---

## 5. The User Interface (React Components)
**File to read:** `frontend/src/pages/Tasks/Tasks.jsx`

Finally, we take that JSON data and draw it on the screen using React.

```jsx
// frontend/src/pages/Tasks/Tasks.jsx
import React, { useState, useEffect } from 'react';

function Tasks() {
    const [tasks, setTasks] = useState([]);

    // When the component loads, fetch the data
    useEffect(() => {
        fetchTasks().then(data => setTasks(data));
    }, []);

    return (
        <div className="task-list">
            <h1>My Tasks</h1>
            {tasks.map(task => (
                <div key={task.id} className="task-card">
                    <h3>{task.title}</h3>
                    <p>Status: {task.status}</p>
                </div>
            ))}
        </div>
    );
}
```
**What to learn here:** 
1. `useState` holds the data.
2. `useEffect` triggers the API call when the page opens.
3. The `.map()` function loops over the tasks array and creates a visual `<div>` card for each one.

---

### 🎉 Summary
1. **Model (`models.py`)**: Stores the data in the database.
2. **Serializer (`serializers.py`)**: Converts data to JSON.
3. **View (`views.py`)**: Creates the API endpoint and applies rules (like "only see your own tasks").
4. **React State (`Tasks.jsx`)**: Fetches the JSON via API and renders it to the screen.

If you can understand this flow, you understand 80% of how modern web applications are built!
