from flask import Flask, render_template, redirect, url_for, request, flash, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager, UserMixin, login_user, login_required, logout_user, current_user
from werkzeug.security import generate_password_hash, check_password_hash

app = Flask(__name__)
app.config['SECRET_KEY'] = 'supersecretkey'
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///db.sqlite3'
db = SQLAlchemy(app)
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'login'

# Database models
class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(150), unique=True, nullable=False)
    password = db.Column(db.String(150), nullable=False)

class TodoItem(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    task = db.Column(db.String(500), nullable=False)
    completed = db.Column(db.Boolean, default=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'))
    subtasks = db.relationship('Subtask', backref='todo_item', lazy=True)

class Subtask(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(500), nullable=False)
    completed = db.Column(db.Boolean, default=False)
    task_id = db.Column(db.Integer, db.ForeignKey('todo_item.id'))

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

@app.route('/')
def home():
    return redirect(url_for('todo'))

# Routes
@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        user = User.query.filter_by(username=username).first()

        if user and check_password_hash(user.password, password):
            login_user(user)
            return redirect(url_for('todo'))
        
        flash('Invalid username or password.')
    
    return render_template('login.html')

@app.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('login'))

@app.route('/todo', methods=['GET'])
@login_required
def todo():
    tasks = TodoItem.query.filter_by(user_id=current_user.id).all()

    # Include subtasks in the response
    todos = []
    for task in tasks:
        subtasks = Subtask.query.filter_by(task_id=task.id).all()
        todos.append({
            'id': task.id,
            'task': task.task,
            'completed': task.completed,
            'subtasks': [{'id': subtask.id, 'name': subtask.name, 'completed': subtask.completed} for subtask in subtasks]
        })

    return render_template('todo.html', todos=todos)

@app.route('/fetch_tasks', methods=['GET'])
@login_required
def fetch_tasks():
    tasks = TodoItem.query.filter_by(user_id=current_user.id).all()
    todos = []
    for task in tasks:
        subtasks = Subtask.query.filter_by(task_id=task.id).all()
        todos.append({
            'id': task.id,
            'task': task.task,
            'completed': task.completed,
            'subtasks': [{'id': subtask.id, 'name': subtask.name, 'completed': subtask.completed} for subtask in subtasks]
        })
    
    return jsonify({'success': True, 'todos': todos})

@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')

        # Check if username already exists
        existing_user = User.query.filter_by(username=username).first()
        if existing_user:
            flash('Username already exists. Choose a different one.')
            return redirect(url_for('register'))

        # Hash the password before storing it
        hashed_password = generate_password_hash(password, method='pbkdf2:sha256')
        new_user = User(username=username, password=hashed_password)
        db.session.add(new_user)
        db.session.commit()

        flash('Registration successful! You can now log in.')
        return redirect(url_for('login'))
    
    return render_template('register.html')

# Add task route (POST)
@app.route('/add_task', methods=['POST'])
@login_required
def add_task():
    try:
        data = request.get_json()
        task_name = data.get('task', '').strip()  # Get task name and trim whitespace

        # No need to check for empty task_name here since we're sending "Untitled"

        new_task = TodoItem(task=task_name,user_id=current_user.id)
        db.session.add(new_task)
        db.session.commit()

        return jsonify({'success': True, 'id': new_task.id, 'task': new_task.task, 'completed': new_task.completed})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 400

# Delete task route (POST)
@app.route('/delete_task/<int:task_id>', methods=['POST'])
@login_required
def delete_task(task_id):
    task_to_delete = TodoItem.query.filter_by(id=task_id, user_id=current_user.id).first()
    if task_to_delete:
        db.session.delete(task_to_delete)
        db.session.commit()
        return jsonify({'success': True})
    return jsonify({'success': False}), 400

# Toggle task completion route (POST)
@app.route('/toggle_task/<int:task_id>', methods=['POST'])
@login_required
def toggle_task(task_id):
    task_to_toggle = TodoItem.query.filter_by(id=task_id, user_id=current_user.id).first()
    if task_to_toggle:
        task_to_toggle.completed = not task_to_toggle.completed
        db.session.commit()
        return jsonify({'success': True, 'completed': task_to_toggle.completed})
    return jsonify({'success': False}), 400

# Add subtask route (POST)
@app.route('/add_subtask/<int:task_id>', methods=['POST'])
@login_required
def add_subtask(task_id):
    try:
        # 1. Get the task to which the subtask will be added
        task = TodoItem.query.get_or_404(task_id)

        # 2. Get the subtask name from the request data
        data = request.get_json()
        subtask_name = data.get('subtask', '').strip()  # Get subtask name and trim whitespace
        
        # 3. Create a new Subtask object
        new_subtask = Subtask(name=subtask_name, task_id=task_id) 
        # 4. Add the new subtask to the database
        db.session.add(new_subtask)
        db.session.commit()

        # 5. Return a success response with the new subtask's ID and name
        return jsonify({'success': True, 'subtask_id': new_subtask.id, 'subtask': new_subtask.name})

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 400

# Toggle subtask completion route (POST)
@app.route('/toggle_subtask/<int:subtask_id>', methods=['POST'])
@login_required
def toggle_subtask(subtask_id):
    subtask_to_toggle = Subtask.query.get(subtask_id)
    if subtask_to_toggle:
        subtask_to_toggle.completed = not subtask_to_toggle.completed
        db.session.commit()
        return jsonify({'success': True, 'completed': subtask_to_toggle.completed})
    return jsonify({'success': False}), 400

@app.route('/delete_subtask/<int:subtask_id>', methods=['POST'])
@login_required
def delete_subtask(subtask_id):
    subtask_to_delete = Subtask.query.filter_by(id=subtask_id).first()
    if subtask_to_delete:
        db.session.delete(subtask_to_delete)
        db.session.commit()
        return jsonify({'success': True})
    return jsonify({'success': False}), 400

# Edit task name route (POST)
@app.route('/edit_task/<int:task_id>', methods=['POST'])
@login_required
def edit_task(task_id):
    try:
        task = TodoItem.query.get_or_404(task_id)
        data = request.get_json()
        new_name = data.get('new_name', '').strip()  # Get new name and trim whitespace

        if not new_name:  # If new name is empty after trimming
            new_name = "untitled"  # Set it to "Untitled"

        task.task = new_name
        db.session.commit()
        return jsonify({'success': True, 'new_name': new_name})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 400

# Edit subtask name route (POST)
@app.route('/edit_subtask/<int:subtask_id>', methods=['POST'])
@login_required
def edit_subtask(subtask_id):
    try:
        # 1. Get the subtask to be edited
        subtask = Subtask.query.get_or_404(subtask_id)

        # 2. Get the new name from the request data
        data = request.get_json()
        new_name = data.get('new_name', '').strip()  # Get new name and trim whitespace

        # 3. Update the subtask's name
        subtask.name = new_name 

        # 4. Commit the changes to the database
        db.session.commit()

        # 5. Return a success response with the new name
        return jsonify({'success': True, 'new_name': new_name})

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 400


if __name__ == '__main__':
    with app.app_context():
        db.create_all()  # Ensure this runs within an application context
    app.run(debug=True,host='0.0.0.0')
