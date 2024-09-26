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

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

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

@app.route('/todo', methods=['GET', 'POST'])
@login_required
def todo():
    if request.method == 'POST':
        task = request.form.get('task')
        if task:
            new_task = TodoItem(task=task, user_id=current_user.id)
            db.session.add(new_task)
            db.session.commit()
        if 'delete' in request.form:
            todo_id = request.form.get('delete')
            task_to_delete = TodoItem.query.filter_by(id=todo_id, user_id=current_user.id).first()
            if task_to_delete:
                db.session.delete(task_to_delete)
                db.session.commit()
        if 'toggle' in request.form:
            todo_id = request.form.get('toggle')
            task_to_toggle = TodoItem.query.filter_by(id=todo_id, user_id=current_user.id).first()
            if task_to_toggle:
                task_to_toggle.completed = not task_to_toggle.completed
                db.session.commit()
    todos = TodoItem.query.filter_by(user_id=current_user.id).order_by(TodoItem.completed.asc()).all()
    return render_template('todo.html', todos=todos)

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

@app.route('/add_task', methods=['POST'])
@login_required
def add_task():
    task = request.json.get('task')  # Receiving JSON data via Fetch
    if task:
        new_task = TodoItem(task=task, user_id=current_user.id)
        db.session.add(new_task)
        db.session.commit()
        return jsonify({'success': True, 'task': new_task.task, 'id': new_task.id, 'completed': new_task.completed})
    return jsonify({'success': False}), 400

@app.route('/delete_task/<int:task_id>', methods=['POST'])
@login_required
def delete_task(task_id):
    task_to_delete = TodoItem.query.filter_by(id=task_id, user_id=current_user.id).first()
    if task_to_delete:
        db.session.delete(task_to_delete)
        db.session.commit()
        return jsonify({'success': True})
    return jsonify({'success': False}), 400

@app.route('/toggle_task/<int:task_id>', methods=['POST'])
@login_required
def toggle_task(task_id):
    task_to_toggle = TodoItem.query.filter_by(id=task_id, user_id=current_user.id).first()
    if task_to_toggle:
        task_to_toggle.completed = not task_to_toggle.completed
        db.session.commit()
        return jsonify({'success': True, 'completed': task_to_toggle.completed})
    return jsonify({'success': False}), 400

if __name__ == '__main__':
    with app.app_context():
        db.create_all()  # Ensure this runs within an application context
    app.run(debug=True)
